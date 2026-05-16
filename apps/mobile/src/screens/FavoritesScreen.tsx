import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FavoriteWithListingDto } from '@clickanunt/api-contracts';

import { favoritesApi, getLastDataSource } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useLiveSync } from '../hooks/useLiveSync';
import type { FavoritesScreenNavigation } from '../navigation/types';
import { THEME } from '../theme';
import { ListingPhotoImage } from '../components/ListingPhotoImage';

const E = THEME.enterprise;

export function FavoritesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FavoritesScreenNavigation>();
  const { user } = useAuth();
  const [items, setItems] = useState<FavoriteWithListingDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setListError(null);
    try {
      setItems(await favoritesApi.list());
      setOfflineMode(getLastDataSource('favorites.list') === 'cache');
    } catch {
      setListError('Nu am putut încărca favoritele. Trage în jos pentru a reîncerca.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveSync(load, { intervalMs: 15000 });

  const totalViews = useMemo(
    () => items.reduce((sum, f) => sum + (f.listing.views ?? 0), 0),
    [items]
  );
  const featuredCount = useMemo(
    () => items.filter((f) => f.listing.isFeatured).length,
    [items]
  );

  const openListing = useCallback(
    (listingId: string) => {
      navigation.navigate('ListingDetails', { listingId });
    },
    [navigation]
  );

  const goHomeTab = useCallback(() => {
    navigation.navigate('Acasă');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <View style={styles.hairline} />
        <Text style={styles.overline}>Salvate pentru tine</Text>
        <Text style={styles.headerTitle}>
          Anunțurile mele <Text style={styles.headerAccent}>favorite</Text>
        </Text>
        <Text style={styles.headerSubtitle}>Acces rapid la anunțurile pe care le-ai salvat</Text>
      </View>

      {offlineMode ? <Text style={styles.offlineHint}>Afișăm ultimele date salvate.</Text> : null}
      {listError ? <Text style={styles.errorHint}>{listError}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconRose]}>
            <Text style={styles.statGlyphRose}>♥</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Favorite totale</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconSky]}>
            <Text style={styles.statGlyphSky}>◎</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{totalViews.toLocaleString('ro-RO')}</Text>
            <Text style={styles.statLabel}>Vizualizări totale</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconEmerald]}>
            <Text style={styles.statGlyphEmerald}>✦</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{featuredCount}</Text>
            <Text style={styles.statLabel}>Evidențiate</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.content}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        renderItem={({ item }) => {
          const listing = item.listing;
          return (
            <View style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Deschide ${listing.title}`}
                onPress={() => openListing(listing.id)}
                style={({ pressed }) => [styles.cardMain, pressed && styles.cardMainPressed]}
              >
                <ListingPhotoImage
                  photo={listing.photos?.[0]}
                  variant="medium"
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                {listing.isFeatured ? (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>TOP</Text>
                  </View>
                ) : null}
                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {listing.city || 'Localitate neprecizată'}
                    {listing.county ? ` · ${listing.county}` : ''}
                  </Text>
                  <Text style={styles.viewsMeta}>
                    {(listing.views ?? 0).toLocaleString('ro-RO')} vizualizări
                  </Text>
                  <Text style={styles.price}>
                    {listing.priceAmount != null
                      ? `${listing.priceAmount.toLocaleString('ro-RO')} ${listing.priceCurrency || 'RON'}`
                      : 'Preț la cerere'}
                  </Text>
                </View>
              </Pressable>
              {user ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Elimină din favorite"
                  disabled={!!removingId}
                  onPress={() => {
                    if (removingId) return;
                    setRemovingId(listing.id);
                    favoritesApi
                      .remove(listing.id)
                      .then(() =>
                        setItems((prev) => prev.filter((f) => f.listingId !== listing.id))
                      )
                      .catch(() => {})
                      .finally(() => setRemovingId(null));
                  }}
                  style={styles.removePressable}
                >
                  <Text style={styles.remove}>
                    {removingId === listing.id ? 'Se elimină…' : 'Elimină din favorite'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          !refreshing && !listError ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Niciun anunț favorit</Text>
              <Text style={styles.emptyText}>
                Salvează anunțurile care te interesează pentru acces rapid ulterior.
              </Text>
              <Pressable onPress={goHomeTab} style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>Către anunțuri</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: E.pageBg },
  headerBlock: { paddingHorizontal: 16, paddingBottom: 10 },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: E.hairline,
    marginBottom: 12,
    borderRadius: 1,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: E.textDim,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: THEME.colors.textPrimary, letterSpacing: -0.3 },
  headerAccent: { color: E.orange, fontWeight: '700' },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 360,
  },
  offlineHint: { color: THEME.colors.warning, paddingHorizontal: 16, paddingBottom: 6, fontWeight: '600' },
  errorHint: { color: THEME.colors.error, paddingHorizontal: 16, paddingBottom: 8, fontWeight: '600', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: E.cardBg,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: E.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...THEME.shadow.card,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statIconRose: {
    borderColor: 'rgba(244, 63, 94, 0.35)',
    backgroundColor: 'rgba(136, 19, 55, 0.35)',
  },
  statIconSky: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(12, 74, 110, 0.35)',
  },
  statIconEmerald: {
    borderColor: 'rgba(52, 211, 153, 0.35)',
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
  },
  statGlyphRose: { fontSize: 16, color: E.rose, fontWeight: '700' },
  statGlyphSky: { fontSize: 16, color: E.sky, fontWeight: '700' },
  statGlyphEmerald: { fontSize: 16, color: E.emerald, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '700', color: THEME.colors.textPrimary },
  statLabel: { fontSize: 10, fontWeight: '600', color: E.textDim, marginTop: 2, textTransform: 'uppercase' },
  content: { padding: 12, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: E.cardBg,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: E.cardBorder,
    overflow: 'hidden',
    ...THEME.shadow.card,
  },
  cardMain: { flex: 1, position: 'relative' },
  cardMainPressed: { opacity: 0.92 },
  cardImage: { width: '100%', height: 132, backgroundColor: THEME.colors.surface },
  featuredBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    backgroundColor: E.orangeDeep,
  },
  featuredBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cardBody: { padding: 12 },
  title: { fontWeight: '700', color: THEME.colors.textPrimary, fontSize: 16 },
  subtitle: { color: THEME.colors.textSecondary, marginTop: 6, fontSize: 13 },
  viewsMeta: { color: E.textDim, marginTop: 6, fontSize: 12, fontWeight: '600' },
  price: { color: E.orange, fontWeight: '800', marginTop: 10, fontSize: 18 },
  removePressable: {
    borderTopWidth: 1,
    borderTopColor: E.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  remove: { color: THEME.colors.error, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  emptyWrap: {
    marginTop: 24,
    padding: 20,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: E.cardBorder,
    backgroundColor: E.cardBg,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.colors.textPrimary, textAlign: 'center' },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: THEME.radius.md,
    backgroundColor: E.orangeDeep,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
