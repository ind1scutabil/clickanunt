import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getLastDataSource, listingsApi } from '../api/client';
import { useLiveSync } from '../hooks/useLiveSync';
import { THEME } from '../theme';
import type { Listing } from '../types';

type Props = {
  listingId: string;
};

export function ListingDetailsScreen({ listingId }: Props): React.JSX.Element {
  const [item, setItem] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listingsApi.getById(listingId);
      setItem(data);
      setOfflineMode(getLastDataSource(`listing.${listingId}`) === 'cache');
    } catch {
      setError('Nu am putut încărca detaliile anunțului.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveSync(load, { intervalMs: 10000 });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Anunț indisponibil.'}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Reîncearcă</Text>
        </Pressable>
      </View>
    );
  }

  const photos = item.photos?.length
    ? item.photos
    : ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200'];

  const attributes = item.attributes && typeof item.attributes === 'object'
    ? Object.entries(item.attributes).filter(([, value]) => value !== null && value !== undefined && String(value) !== '')
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
        {photos.map((photo) => (
          <Image key={photo} source={{ uri: photo }} style={styles.carouselImage} resizeMode="cover" />
        ))}
      </ScrollView>

      <View style={styles.card}>
        {offlineMode ? <Text style={styles.offlineHint}>Afișăm ultimele date salvate.</Text> : null}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>
          {item.priceAmount ? `${item.priceAmount.toLocaleString('ro-RO')} ${item.priceCurrency || 'RON'}` : 'Preț la cerere'}
        </Text>
        <Text style={styles.meta}>{item.city || 'Localitate neprecizată'}{item.county ? `, ${item.county}` : ''}</Text>

        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Categorie</Text>
          <Text style={styles.specValue}>{item.category || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Marcă</Text>
          <Text style={styles.specValue}>{item.make || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Model</Text>
          <Text style={styles.specValue}>{item.model || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>An</Text>
          <Text style={styles.specValue}>{item.year ? String(item.year) : '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Kilometraj</Text>
          <Text style={styles.specValue}>{item.mileage ? `${item.mileage.toLocaleString('ro-RO')} km` : '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Combustibil</Text>
          <Text style={styles.specValue}>{item.fuel || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Transmisie</Text>
          <Text style={styles.specValue}>{item.transmission || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Condiție</Text>
          <Text style={styles.specValue}>{item.condition || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Telefon</Text>
          <Text style={styles.specValue}>{item.contactPhone || '—'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Status</Text>
          <Text style={styles.specValue}>{item.status || 'active'}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Vizualizări</Text>
          <Text style={styles.specValue}>{typeof item.views === 'number' ? String(item.views) : '—'}</Text>
        </View>

        {attributes.slice(0, 6).map(([key, value]) => (
          <View style={styles.specRow} key={key}>
            <Text style={styles.specLabel}>{key}</Text>
            <Text style={styles.specValue}>{String(value)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { paddingBottom: 24 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: 20,
  },
  errorText: { color: THEME.colors.error, textAlign: 'center' },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontWeight: '700' },
  carousel: { height: 280 },
  carouselImage: {
    width: 360,
    height: 280,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    padding: 14,
    ...THEME.shadow.card,
  },
  title: { fontSize: 24, fontWeight: '800', color: THEME.colors.textPrimary },
  offlineHint: { color: THEME.colors.warning, fontWeight: '600', marginBottom: 8 },
  price: { fontSize: 24, fontWeight: '800', color: THEME.colors.accent, marginTop: 8 },
  meta: { marginTop: 8, color: THEME.colors.textSecondary },
  description: {
    marginTop: 14,
    color: THEME.colors.textPrimary,
    lineHeight: 22,
    fontSize: 15,
  },
  specRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10,
  },
  specLabel: { color: THEME.colors.textMuted, fontWeight: '600' },
  specValue: { color: THEME.colors.textPrimary, fontWeight: '700' },
});