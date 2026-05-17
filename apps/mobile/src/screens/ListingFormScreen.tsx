import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { categoriesApi, listingsApi, uploadsApi } from '../api/client';
import { CategoryFields } from '../components/CategoryFields';
import { ALL_CATEGORY_LABELS } from '../constants/categoryOptions';
import { addBreadcrumb, trackError, trackEvent } from '../telemetry';
import { THEME } from '../theme';
import { listingPhotoUri, normalizeListingPhotosArray } from '../utils/listingPhotos';
import type { Listing, ListingPayload } from '../types';

type Props = {
  mode: 'create' | 'edit';
  listingId?: string;
  onSuccess: () => void;
};

function photoPreviewUri(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return listingPhotoUri(url, 'medium');
}

export function ListingFormScreen({ mode, listingId, onSuccess }: Props): React.JSX.Element {
  const [loadingListing, setLoadingListing] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  const applyListingToForm = useCallback((data: Listing) => {
    setListing(data);
    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategory(data.category || '');
    setSubcategory(data.subcategory || '');
    setPriceAmount(data.priceAmount != null ? String(data.priceAmount) : '');
    setCity(data.city || '');
    setCounty(data.county || '');
    setMake(data.make || '');
    setModel(data.model || '');
    setYear(data.year != null ? String(data.year) : '');
    setPhotoUrls(normalizeListingPhotosArray(data.photos));
  }, []);

  useEffect(() => {
    let cancelled = false;
    categoriesApi
      .list()
      .then((rows) => {
        if (cancelled) return;
        const labels = rows.map((r) => r.label).filter(Boolean);
        setApiCategories(labels);
        if (mode === 'create' && !category && labels.length > 0) {
          setCategory(labels[0]);
        }
      })
      .catch(() => {
        if (!cancelled && mode === 'create' && !category && ALL_CATEGORY_LABELS.length > 0) {
          setCategory(ALL_CATEGORY_LABELS[0]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, category]);

  useEffect(() => {
    if (mode !== 'edit' || !listingId) {
      setLoadingListing(false);
      return;
    }

    let cancelled = false;
    setLoadingListing(true);
    setLoadError(null);

    listingsApi
      .getById(listingId)
      .then((data) => {
        if (cancelled) return;
        applyListingToForm(data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Nu am putut încărca anunțul pentru editare.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingListing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, listingId, applyListingToForm]);

  const categoryLabels = useMemo(() => {
    const merged = new Set<string>([...ALL_CATEGORY_LABELS, ...apiCategories]);
    if (category) {
      merged.add(category);
    }
    return [...merged].sort((a, b) => a.localeCompare(b, 'ro'));
  }, [apiCategories, category]);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 5 && Number(priceAmount) >= 0 && photoUrls.length >= 1 && category.trim().length > 0;
  }, [photoUrls, priceAmount, title, category]);

  const uploadAsset = async (uri: string, type: 'image' | 'video') => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uploadedUrl = await uploadsApi.uploadBase64({
      data: base64,
      type,
      listingId: mode === 'edit' ? listing?.id : undefined,
    });
    setPhotoUrls((prev) => [...prev, uploadedUrl]);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permisiune necesară', 'Permite accesul la galerie pentru upload.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (result.canceled) {
      return;
    }

    setIsUploading(true);
    try {
      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'image';
        await uploadAsset(asset.uri, type);
      }
    } catch {
      Alert.alert('Upload eșuat', 'Nu am putut urca toate fișierele selectate.');
    } finally {
      setIsUploading(false);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permisiune necesară', 'Permite accesul la cameră pentru captură.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setIsUploading(true);
    try {
      await uploadAsset(result.assets[0].uri, 'image');
    } catch {
      Alert.alert('Upload eșuat', 'Nu am putut urca poza capturată.');
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || isSaving) {
      return;
    }

    addBreadcrumb('submit_listing_form', 'listing');

    const payload: ListingPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim(),
      subcategory: subcategory.trim() || null,
      priceAmount: Number(priceAmount),
      priceCurrency: 'RON',
      city: city.trim() || undefined,
      county: county.trim() || undefined,
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: year ? Number(year) : undefined,
      photos: photoUrls,
    };

    setIsSaving(true);
    try {
      if (mode === 'create') {
        await listingsApi.create(payload);
        await trackEvent('publish_listing', { mode: 'create', category: payload.category });
      } else if (listing?.id) {
        await listingsApi.update(listing.id, payload);
        await trackEvent('publish_listing', { mode: 'edit', listingId: listing.id, category: payload.category });
      } else {
        throw new Error('Anunț indisponibil');
      }

      Alert.alert('Succes', mode === 'create' ? 'Anunț publicat.' : 'Anunț actualizat.');
      onSuccess();
    } catch (error) {
      await trackError('publish_listing_failed', error, { mode, listingId: listing?.id || null });
      Alert.alert('Eroare', 'Nu s-a putut salva anunțul. Verifică datele și încearcă din nou.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingListing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Se încarcă anunțul...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{mode === 'create' ? 'Publică anunț' : 'Editează anunț'}</Text>

      {apiCategories.length > 0 ? (
        <Text style={styles.metaHint}>{apiCategories.length} categorii active în catalog</Text>
      ) : null}

      <TextInput style={styles.input} placeholder="Titlu" placeholderTextColor={THEME.colors.textMuted} value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Descriere"
        placeholderTextColor={THEME.colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <CategoryFields
        category={category}
        subcategory={subcategory}
        categoryLabels={categoryLabels}
        onCategoryChange={setCategory}
        onSubcategoryChange={setSubcategory}
      />

      <TextInput
        style={styles.input}
        placeholder="Preț (RON)"
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType="numeric"
        value={priceAmount}
        onChangeText={setPriceAmount}
      />
      <TextInput style={styles.input} placeholder="Oraș" placeholderTextColor={THEME.colors.textMuted} value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Județ" placeholderTextColor={THEME.colors.textMuted} value={county} onChangeText={setCounty} />
      <TextInput style={styles.input} placeholder="Marcă" placeholderTextColor={THEME.colors.textMuted} value={make} onChangeText={setMake} />
      <TextInput style={styles.input} placeholder="Model" placeholderTextColor={THEME.colors.textMuted} value={model} onChangeText={setModel} />
      <TextInput style={styles.input} placeholder="An" placeholderTextColor={THEME.colors.textMuted} keyboardType="numeric" value={year} onChangeText={setYear} />

      <View style={styles.uploadActions}>
        <Pressable style={styles.secondaryButton} onPress={pickFromLibrary}>
          <Text style={styles.secondaryButtonText}>Alege media</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={capturePhoto}>
          <Text style={styles.secondaryButtonText}>Fă o poză</Text>
        </Pressable>
      </View>

      {isUploading ? <Text style={styles.uploadingText}>Se încarcă fișiere...</Text> : null}

      <View style={styles.mediaList}>
        {photoUrls.map((url) => (
          <View key={url} style={styles.mediaRow}>
            <Image source={{ uri: photoPreviewUri(url) }} style={styles.mediaPreview} />
            <Pressable style={styles.removeButton} onPress={() => setPhotoUrls((prev) => prev.filter((item) => item !== url))}>
              <Text style={styles.removeButtonText}>Șterge</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || isSaving} onPress={submit}>
        <Text style={styles.buttonText}>{isSaving ? 'Se salvează...' : mode === 'create' ? 'Publică' : 'Salvează'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: 20,
  },
  loadingText: { marginTop: 12, color: THEME.colors.textMuted },
  errorText: { color: '#fecaca', textAlign: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: THEME.colors.textPrimary, marginBottom: 4 },
  metaHint: { fontSize: 11, color: THEME.colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    minHeight: 44,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.surface,
    color: THEME.colors.textPrimary,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 10 },
  uploadActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: THEME.colors.textPrimary, fontWeight: '600' },
  uploadingText: { color: THEME.colors.textMuted },
  mediaList: { gap: 8 },
  mediaRow: {
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaPreview: { width: 70, height: 52, borderRadius: 8, backgroundColor: THEME.colors.background },
  removeButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
  },
  removeButtonText: { color: '#f87171', fontWeight: '600' },
  button: {
    height: 46,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
