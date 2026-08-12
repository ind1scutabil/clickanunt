import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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
import { ALL_CATEGORY_LABELS, subcategoriesForCategory } from '../constants/categoryOptions';
import { addBreadcrumb, trackError, trackEvent } from '../telemetry';
import { THEME } from '../theme';
import { listingPhotoUri, normalizeListingPhotosArray } from '../utils/listingPhotos';
import type { Listing, ListingPayload } from '../types';
import {
  contractCategoryRequiresSubcategory,
  getContractAttributeDefsFor,
  getMarketplacePriceFieldCopy,
  allowedPriceTypesFor,
  isJobsCategoryLabel,
  priceTypeForbidsAmount,
  priceTypeRequiresAmount,
  PRICE_TYPE_LABEL_RO,
  SALARY_PERIOD_LABEL_RO,
  SALARY_PERIODS,
  type PriceTypeValue,
  type SalaryPeriodValue,
} from '@clickanunt/api-contracts';
import { AttributeFields } from '../components/AttributeFields';
import { OptionSelect } from '../components/OptionSelect';
import {
  AUTO_CATEGORY_LABEL,
  assertAutoMakeModelPair,
  CAR_MAKES_AND_MODELS,
  CITIES_BY_COUNTY,
  isCityInCounty,
  isKnownCounty,
  POPULAR_MAKES,
  ROMANIAN_COUNTIES,
} from '../constants/locationMakeOptions';

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
  const [priceType, setPriceType] = useState<PriceTypeValue>('FIXED');
  const [priceAmount, setPriceAmount] = useState('');
  const [salaryMode, setSalaryMode] = useState<'unspecified' | 'exact' | 'range'>('unspecified');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState<'RON' | 'EUR'>('RON');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriodValue>('MONTH');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  const applyListingToForm = useCallback((data: Listing) => {
    setListing(data);
    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategory(data.category || '');
    setSubcategory(data.subcategory || '');
    const pt = (data as { priceType?: PriceTypeValue | null }).priceType;
    setPriceType(pt && PRICE_TYPE_LABEL_RO[pt] ? pt : 'FIXED');
    setPriceAmount(data.priceAmount != null ? String(data.priceAmount) : '');
    const sMin = (data as { salaryMin?: number | null }).salaryMin;
    const sMax = (data as { salaryMax?: number | null }).salaryMax;
    if (sMin != null || sMax != null) {
      if (sMin != null && sMax != null && sMin === sMax) {
        setSalaryMode('exact');
        setSalaryMin(String(sMin));
        setSalaryMax('');
      } else {
        setSalaryMode('range');
        setSalaryMin(sMin != null ? String(sMin) : '');
        setSalaryMax(sMax != null ? String(sMax) : '');
      }
      setSalaryCurrency(
        ((data as { salaryCurrency?: string | null }).salaryCurrency as 'RON' | 'EUR') ||
          'RON'
      );
      setSalaryPeriod(
        ((data as { salaryPeriod?: SalaryPeriodValue | null }).salaryPeriod as SalaryPeriodValue) ||
          'MONTH'
      );
    } else {
      setSalaryMode('unspecified');
      setSalaryMin('');
      setSalaryMax('');
    }
    setCity(data.city || '');
    setCounty(data.county || '');
    setMake(data.make || '');
    setModel(data.model || '');
    setYear(data.year != null ? String(data.year) : '');
    setContactPhone(
      'contactPhone' in data && typeof data.contactPhone === 'string' ? data.contactPhone : ''
    );
    setPhotoUrls(normalizeListingPhotosArray(data.photos));
    const attrs =
      data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)
        ? (data.attributes as Record<string, unknown>)
        : {};
    setAttributes(attrs);
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

  const isAutoCategory = category === AUTO_CATEGORY_LABEL;
  const modelsForMake = useMemo(
    () => (make && CAR_MAKES_AND_MODELS[make] ? CAR_MAKES_AND_MODELS[make] : []),
    [make]
  );
  const citiesForCounty = useMemo(
    () => (county && CITIES_BY_COUNTY[county] ? CITIES_BY_COUNTY[county] : []),
    [county]
  );
  const isJobs = isJobsCategoryLabel(category);
  const priceSemantics = getMarketplacePriceFieldCopy(category || null);
  const allowedTypes = useMemo(
    () => allowedPriceTypesFor(category, subcategory || null),
    [category, subcategory],
  );
  const attributeDefs = useMemo(
    () => getContractAttributeDefsFor(category, subcategory || null),
    [category, subcategory],
  );

  const canSubmit = useMemo(() => {
    const subOk =
      !category.trim() ||
      !contractCategoryRequiresSubcategory(category) ||
      subcategory.trim().length > 0;
    // Create requires ≥1 photo (listingCreateSchema). Edit uses listingEditSchema.partial()
    // so legacy rows without photos remain editable without forcing a new upload.
    const photosOk = mode === 'edit' || photoUrls.length >= 1;
    const base =
      title.trim().length >= 5 &&
      photosOk &&
      category.trim().length > 0 &&
      subOk &&
      county.trim().length > 0 &&
      city.trim().length > 0;
    if (!base) return false;
    if (isJobs) {
      if (salaryMode === 'unspecified') return true;
      if (salaryMode === 'exact') return Number(salaryMin) > 0;
      return Number(salaryMin) > 0 && Number(salaryMax) > 0 && Number(salaryMax) >= Number(salaryMin);
    }
    if (!allowedTypes.includes(priceType)) return false;
    if (priceTypeRequiresAmount(priceType)) return Number(priceAmount) > 0;
    return true;
  }, [
    mode,
    photoUrls,
    priceAmount,
    priceType,
    title,
    category,
    subcategory,
    county,
    city,
    isJobs,
    salaryMode,
    salaryMin,
    salaryMax,
    allowedTypes,
  ]);

  const resolveReadableImageUri = async (uri: string): Promise<string> => {
    // Android photo picker often returns content:// — FileSystem.readAsStringAsync
    // needs a real file path. Copy into cache first (same upload pipeline afterward).
    if (uri.startsWith('file://')) {
      return uri;
    }
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('CACHE_UNAVAILABLE');
    }
    const dest = `${cacheDir}ca-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  };

  const uploadAsset = async (uri: string, type: 'image' | 'video') => {
    if (type === 'video') {
      throw new Error('VIDEO_NOT_SUPPORTED');
    }
    const readableUri = await resolveReadableImageUri(uri);
    const base64 = await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uploadedUrl = await uploadsApi.uploadBase64({
      data: base64,
      type: 'image',
      listingId: mode === 'edit' ? listing?.id : undefined,
    });
    setPhotoUrls((prev) => [...prev, uploadedUrl]);
  };

  const pickFromLibrary = async () => {
    // Android 13+ system Photo Picker does not need READ_MEDIA_IMAGES.
    // Do not force a storage permission the OS picker does not require.
    // iOS still needs the photo-library prompt.
    if (Platform.OS === 'ios') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galerie pentru upload.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
        if (asset.type === 'video') {
          Alert.alert('Video indisponibil', 'Video nu este încă suportat. Adaugă doar fotografii.');
          continue;
        }
        const mime = (asset.mimeType || '').toLowerCase();
        const uriLower = (asset.uri || '').toLowerCase();
        if (
          mime === 'image/heic' ||
          mime === 'image/heif' ||
          uriLower.endsWith('.heic') ||
          uriLower.endsWith('.heif')
        ) {
          Alert.alert(
            'Format nesuportat',
            'Formatul HEIC nu este acceptat momentan. Alege o fotografie JPEG, PNG sau WebP.'
          );
          continue;
        }
        await uploadAsset(asset.uri, 'image');
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'necunoscut';
      trackError('listing_photo_upload_failed', err, { detail }).catch(() => {});
      Alert.alert(
        'Upload eșuat',
        `Nu am putut urca toate fișierele selectate (${detail}). Reîncearcă după ce acorzi acces la galerie.`
      );
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

    if (!isJobs) {
      if (!allowedTypes.includes(priceType)) {
        Alert.alert('Tip preț', 'Selectează un tip de preț valid pentru categorie.');
        return;
      }
      if (priceTypeRequiresAmount(priceType) && Number(priceAmount) <= 0) {
        Alert.alert('Preț invalid', 'Prețul trebuie să fie mai mare de 0.');
        return;
      }
    } else if (salaryMode === 'exact' && Number(salaryMin) <= 0) {
      Alert.alert('Salariu invalid', 'Salariul trebuie să fie mai mare de 0.');
      return;
    } else if (
      salaryMode === 'range' &&
      (Number(salaryMin) <= 0 || Number(salaryMax) <= 0 || Number(salaryMax) < Number(salaryMin))
    ) {
      Alert.alert('Salariu invalid', 'Completează un interval salarial valid.');
      return;
    }
    if (!county.trim() || !city.trim()) {
      Alert.alert('Locație incompletă', 'Completează județul și orașul.');
      return;
    }
    if (!isKnownCounty(county.trim())) {
      Alert.alert('Locație invalidă', 'Județ invalid');
      return;
    }
    if (!isCityInCounty(county.trim(), city.trim())) {
      Alert.alert('Locație invalidă', 'Orașul nu aparține județului selectat');
      return;
    }
    if (isAutoCategory) {
      const makeCheck = assertAutoMakeModelPair({
        category,
        make: make.trim() || null,
        model: model.trim() || null,
      });
      if (!makeCheck.ok) {
        Alert.alert('Marcă / model', makeCheck.message);
        return;
      }
    }
    if (contractCategoryRequiresSubcategory(category) && !subcategory.trim()) {
      Alert.alert('Subcategorie', 'Selectează o subcategorie.');
      return;
    }

    addBreadcrumb('submit_listing_form', 'listing');

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim(),
      subcategory: subcategory.trim() || null,
      city: city.trim(),
      county: county.trim(),
      // create: always send photos (schema min 1). edit: omit when empty so partial schema keeps legacy rows.
      ...(mode === 'create' || photoUrls.length > 0 ? { photos: photoUrls } : {}),
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      ...(isAutoCategory
        ? {
            make: make.trim() || undefined,
            model: model.trim() || undefined,
            year: year ? Number(year) : undefined,
          }
        : {}),
      ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : mode === 'edit' ? { contactPhone: null } : {}),
    } as ListingPayload;

    if (isJobs) {
      payload.priceType = null;
      payload.priceAmount = null;
      payload.priceCurrency = null;
      if (salaryMode === 'exact' && Number(salaryMin) > 0) {
        const v = Number(salaryMin);
        payload.salaryMin = v;
        payload.salaryMax = v;
        payload.salaryCurrency = salaryCurrency;
        payload.salaryPeriod = salaryPeriod;
      } else if (salaryMode === 'range') {
        payload.salaryMin = Number(salaryMin);
        payload.salaryMax = Number(salaryMax);
        payload.salaryCurrency = salaryCurrency;
        payload.salaryPeriod = salaryPeriod;
      } else {
        payload.salaryMin = null;
        payload.salaryMax = null;
        payload.salaryCurrency = null;
        payload.salaryPeriod = null;
      }
    } else {
      payload.priceType = priceType;
      if (priceTypeForbidsAmount(priceType)) {
        payload.priceAmount = null;
        payload.priceCurrency = null;
      } else {
        payload.priceAmount = Number(priceAmount);
        payload.priceCurrency = 'RON';
      }
      payload.salaryMin = null;
      payload.salaryMax = null;
      payload.salaryCurrency = null;
      payload.salaryPeriod = null;
    }

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

      Alert.alert(
        'Succes',
        mode === 'create'
          ? 'Anunțul a fost trimis. Poate necesita moderare înainte de a apărea public.'
          : 'Anunț actualizat.'
      );
      onSuccess();
    } catch (error) {
      await trackError('publish_listing_failed', error, { mode, listingId: listing?.id || null });
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Nu s-a putut salva anunțul. Verifică județul, orașul, prețul și fotografiile.';
      Alert.alert('Eroare', message);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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
        requireSubcategory={mode === 'create' || subcategoriesForCategory(category).length > 0}
        onCategoryChange={(next) => {
          const apply = () => {
            setCategory(next);
            setSubcategory('');
            setAttributes({});
            if (next !== AUTO_CATEGORY_LABEL) {
              setMake('');
              setModel('');
              setYear('');
            }
          };
          const hasAttr = Object.keys(attributes).length > 0;
          if (category && category !== next && (make || model || year || hasAttr)) {
            Alert.alert(
              'Schimbă categoria?',
              'Câmpurile specifice categoriei vor fi resetate.',
              [
                { text: 'Anulează', style: 'cancel' },
                { text: 'Continuă', style: 'destructive', onPress: apply },
              ]
            );
            return;
          }
          apply();
        }}
        onSubcategoryChange={(sub) => {
          setSubcategory(sub);
          setAttributes({});
        }}
      />

      <AttributeFields
        defs={attributeDefs}
        values={attributes}
        onChange={(key, value) =>
          setAttributes((prev) => {
            const next = { ...prev };
            if (value === undefined) delete next[key];
            else next[key] = value;
            return next;
          })
        }
      />

      {isJobs ? (
        <View style={styles.priceBlock}>
          <Text style={styles.metaHint}>{priceSemantics.label}</Text>
          {priceSemantics.hint ? <Text style={styles.metaHint}>{priceSemantics.hint}</Text> : null}
          <View style={styles.chipRow}>
            {(
              [
                ['unspecified', 'Nespecificat'],
                ['exact', 'Exact'],
                ['range', 'Interval'],
              ] as const
            ).map(([modeKey, label]) => (
              <Pressable
                key={modeKey}
                style={[styles.chip, salaryMode === modeKey && styles.chipActive]}
                onPress={() => setSalaryMode(modeKey)}
              >
                <Text style={styles.chipText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {salaryMode !== 'unspecified' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={salaryMode === 'range' ? 'Salariu minim' : 'Salariu'}
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numeric"
                value={salaryMin}
                onChangeText={setSalaryMin}
              />
              {salaryMode === 'range' ? (
                <TextInput
                  style={styles.input}
                  placeholder="Salariu maxim"
                  placeholderTextColor={THEME.colors.textMuted}
                  keyboardType="numeric"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                />
              ) : null}
              <View style={styles.chipRow}>
                {SALARY_PERIODS.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, salaryPeriod === p && styles.chipActive]}
                    onPress={() => setSalaryPeriod(p)}
                  >
                    <Text style={styles.chipText}>/{SALARY_PERIOD_LABEL_RO[p]}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.chipRow}>
                {(['RON', 'EUR'] as const).map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.chip, salaryCurrency === c && styles.chipActive]}
                    onPress={() => setSalaryCurrency(c)}
                  >
                    <Text style={styles.chipText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.priceBlock}>
          <Text style={styles.metaHint}>{priceSemantics.label}</Text>
          <View style={styles.chipRow}>
            {allowedTypes.map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, priceType === t && styles.chipActive]}
                onPress={() => {
                  setPriceType(t);
                  if (priceTypeForbidsAmount(t)) setPriceAmount('');
                }}
              >
                <Text style={styles.chipText}>{PRICE_TYPE_LABEL_RO[t]}</Text>
              </Pressable>
            ))}
          </View>
          {priceTypeRequiresAmount(priceType) ? (
            <TextInput
              style={styles.input}
              placeholder="Sumă (RON)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={priceAmount}
              onChangeText={setPriceAmount}
            />
          ) : null}
        </View>
      )}
      <OptionSelect
        label="Județ *"
        value={county}
        options={[...ROMANIAN_COUNTIES]}
        placeholder="Selectează județul"
        onChange={(next) => {
          setCounty(next);
          setCity('');
        }}
      />
      <OptionSelect
        label="Oraș / localitate *"
        value={city}
        options={citiesForCounty}
        placeholder={county ? 'Selectează localitatea' : 'Alege mai întâi județul'}
        disabled={!county}
        onChange={setCity}
      />
      {isAutoCategory ? (
        <>
          <OptionSelect
            label="Marcă"
            value={make}
            options={[...POPULAR_MAKES]}
            placeholder="Selectează marca"
            onChange={(next) => {
              setMake(next);
              setModel('');
            }}
          />
          <OptionSelect
            label="Model"
            value={model}
            options={modelsForMake}
            placeholder={make ? 'Selectează modelul' : 'Alege mai întâi marca'}
            disabled={!make}
            onChange={setModel}
          />
          <TextInput
            style={styles.input}
            placeholder="An"
            placeholderTextColor={THEME.colors.textMuted}
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
          />
        </>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Telefon contact (opțional)"
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType="phone-pad"
        value={contactPhone}
        onChangeText={setContactPhone}
      />

      <View style={styles.uploadActions}>
        <Pressable style={styles.secondaryButton} onPress={pickFromLibrary}>
          <Text style={styles.secondaryButtonText}>Alege fotografii (JPEG/PNG/WebP)</Text>
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

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        disabled={!canSubmit || isSaving}
        onPress={submit}
        accessibilityRole="button"
        accessibilityLabel={mode === 'create' ? 'Publică anunț' : 'Salvează anunț'}
        accessibilityState={{ disabled: !canSubmit || isSaving }}
      >
        <Text style={styles.buttonText}>{isSaving ? 'Se salvează...' : mode === 'create' ? 'Publică' : 'Salvează'}</Text>
      </Pressable>
      {!canSubmit ? (
        <Text style={styles.metaHint}>
          {mode === 'create' && photoUrls.length < 1
            ? 'Adaugă cel puțin o fotografie pentru a publica.'
            : contractCategoryRequiresSubcategory(category) && !subcategory.trim()
              ? 'Selectează o subcategorie.'
              : 'Completează titlul, categoria, județul și localitatea.'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 80 },
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
  priceBlock: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
  },
  chipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + '22',
  },
  chipText: { color: THEME.colors.textPrimary, fontSize: 12, fontWeight: '600' },
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
