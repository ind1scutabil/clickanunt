import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { listingsApi, uploadsApi } from '../api/client';
import { addBreadcrumb, trackError, trackEvent } from '../telemetry';
import type { Listing, ListingPayload } from '../types';

type Props = {
  mode: 'create' | 'edit';
  listing?: Listing;
  onSuccess: () => void;
};

export function ListingFormScreen({ mode, listing, onSuccess }: Props): React.JSX.Element {
  const [title, setTitle] = useState(listing?.title || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Auto');
  const [priceAmount, setPriceAmount] = useState(listing?.priceAmount ? String(listing.priceAmount) : '');
  const [city, setCity] = useState(listing?.city || '');
  const [make, setMake] = useState(listing?.make || '');
  const [model, setModel] = useState(listing?.model || '');
  const [year, setYear] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 5 && Number(priceAmount) >= 0 && photoUrls.length >= 1;
  }, [photoUrls, priceAmount, title]);

  const uploadAsset = async (uri: string, type: 'image' | 'video') => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uploadedUrl = await uploadsApi.uploadBase64({ data: base64, type });
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
      category: category.trim() || 'Auto',
      priceAmount: Number(priceAmount),
      priceCurrency: 'RON',
      city: city.trim() || undefined,
      county: undefined,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{mode === 'create' ? 'Publică anunț' : 'Editează anunț'}</Text>

      <TextInput style={styles.input} placeholder="Titlu" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Descriere" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Categorie" value={category} onChangeText={setCategory} />
      <TextInput style={styles.input} placeholder="Preț" keyboardType="numeric" value={priceAmount} onChangeText={setPriceAmount} />
      <TextInput style={styles.input} placeholder="Oraș" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Marcă" value={make} onChangeText={setMake} />
      <TextInput style={styles.input} placeholder="Model" value={model} onChangeText={setModel} />
      <TextInput style={styles.input} placeholder="An" keyboardType="numeric" value={year} onChangeText={setYear} />
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
            <Image source={{ uri: url }} style={styles.mediaPreview} />
            <Pressable
              style={styles.removeButton}
              onPress={() => setPhotoUrls((prev) => prev.filter((item) => item !== url))}
            >
              <Text style={styles.removeButtonText}>Șterge</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Pentru upload media nativ avansat poți folosi în continuare flow-ul web din fallback.
        </Text>
      </View>

      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || isSaving} onPress={submit}>
        <Text style={styles.buttonText}>{isSaving ? 'Se salvează...' : mode === 'create' ? 'Publică' : 'Salvează'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  infoBox: { borderRadius: 10, backgroundColor: '#EEF2FF', padding: 10 },
  infoText: { color: '#3730A3', fontSize: 12 },
  uploadActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#111827', fontWeight: '600' },
  uploadingText: { color: '#6B7280' },
  mediaList: { gap: 8 },
  mediaRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaPreview: { width: 70, height: 52, borderRadius: 8, backgroundColor: '#F3F4F6' },
  removeButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  removeButtonText: { color: '#B91C1C', fontWeight: '600' },
  button: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});