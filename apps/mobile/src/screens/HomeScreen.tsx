import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoriesApi, getLastDataSource, listingsApi, listingsBrowseQueryString } from '../api/client';
import { useLiveSync } from '../hooks/useLiveSync';
import { addBreadcrumb, trackEvent } from '../telemetry';
import { THEME } from '../theme';
import { primaryListingPhotoUri } from '../utils/listingPhotos';
import type { Listing } from '../types';

type Props = {
  onOpenListing: (listingId: string) => void;
  onOpenCreateListing: () => void;
};

type CategoryTab = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; count?: number };

function iconForCategory(label: string): keyof typeof Ionicons.glyphMap {
  const l = label.toLowerCase();
  if (l.includes('auto') || l.includes('moto')) return 'car-sport';
  if (l.includes('imobiliar')) return 'business';
  if (l.includes('electron')) return 'phone-portrait';
  if (l.includes('servici')) return 'construct';
  if (l.includes('modă') || l.includes('frumuse')) return 'shirt';
  if (l.includes('casă') || l.includes('grădin')) return 'home';
  if (l.includes('sport') || l.includes('timp liber')) return 'football';
  if (l.includes('copil')) return 'happy';
  if (l.includes('anim')) return 'paw';
  if (l.includes('job') || l.includes('muncă')) return 'briefcase';
  if (l.includes('agricult')) return 'leaf';
  return 'pricetag';
}

const DEFAULT_TABS: CategoryTab[] = [{ key: 'all', label: 'Toate', icon: 'apps' }];

export function HomeScreen({ onOpenListing, onOpenCreateListing }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>(DEFAULT_TABS);
  const [offlineMode, setOfflineMode] = useState(false);
  const listRef = useRef<FlatList<Listing> | null>(null);
  const savedOffset = useRef(0);

  useEffect(() => {
    let cancelled = false;
    categoriesApi
      .list()
      .then((rows) => {
        if (cancelled) return;
        const next: CategoryTab[] = [
          { key: 'all', label: 'Toate', icon: 'apps' },
          ...rows.map((r) => ({
            key: r.key,
            label: r.label,
            icon: iconForCategory(r.label),
            count: r.count,
          })),
        ];
        setCategoryTabs(next);
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryTabs(DEFAULT_TABS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const q = searchQuery.trim();
      const feedParams = {
        page: 1,
        limit: 24,
        status: 'active',
        sort: 'newest' as const,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        q: q.length >= 2 ? q : undefined,
      };
      const data = await listingsApi.browseFeed(feedParams);
      setItems(data);
      const cacheKey = `listings.browse.${listingsBrowseQueryString(feedParams)}`;
      setOfflineMode(getLastDataSource(cacheKey) === 'cache');
    } catch {
      setError('Nu am putut încărca anunțurile.');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveSync(load, { intervalMs: 12000 });

  useFocusEffect(
    useCallback(() => {
      if (savedOffset.current <= 0) {
        return;
      }

      const timer = setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: savedOffset.current, animated: false });
      }, 120);

      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <Text style={styles.headerTitle}>Acasă</Text>
        <Text style={styles.headerSubtitle}>Actualizare automată la 12 secunde</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Caută (min. 2 caractere) — același motor ca pe site"
          placeholderTextColor={THEME.colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <Pressable
          style={styles.publishButton}
          onPress={() => {
            addBreadcrumb('publish_listing_cta_home', 'ui');
            trackEvent('publish_listing', { source: 'home_cta' }).catch(() => {});
            onOpenCreateListing();
          }}
        >
          <View style={styles.publishIconWrap}>
            <Ionicons name="add-circle" size={18} color="#fff" />
          </View>
          <View style={styles.publishTextWrap}>
            <Text style={styles.publishTitle}>Publică anunț</Text>
            <Text style={styles.publishSubtitle}>Adaugă rapid un anunț nou</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.accent} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categoryTabs.map((tab) => {
            const active = selectedCategory === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.categoryTab, active ? styles.categoryTabActive : undefined]}
                onPress={() => {
                  setSelectedCategory(tab.key);
                  trackEvent('search', { mode: 'category', category: tab.key }).catch(() => {});
                }}
              >
                <View style={[styles.categoryIconWrap, active ? styles.categoryIconWrapActive : undefined]}>
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={active ? THEME.colors.accent : THEME.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.categoryText, active ? styles.categoryTextActive : undefined]} numberOfLines={1}>
                  {tab.label}
                  {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {offlineMode ? <Text style={styles.offlineHint}>Afișăm ultimele date salvate.</Text> : null}

      <FlatList
        ref={listRef}
        key="home-grid-2"
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        onScroll={(event) => {
          savedOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              addBreadcrumb('open_listing_from_home', 'ui');
              trackEvent('view_listing', { listingId: item.id, source: 'home_card' }).catch(() => {});
              onOpenListing(item.id);
            }}
          >
            <Image
              source={{ uri: primaryListingPhotoUri(item.photos) }}
              style={styles.coverImage}
              resizeMode="cover"
            />

            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.isPromoted || item.isFeatured ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.isPromoted ? 'Promovat' : 'Featured'}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.secondaryLine} numberOfLines={1}>
              {item.make && item.model ? `${item.make} ${item.model}` : item.city || 'Localitate neprecizată'}
            </Text>

            <Text style={styles.meta} numberOfLines={1}>{item.city || 'Localitate neprecizată'}</Text>

            <Text style={styles.price}>
              {item.priceAmount != null
                ? `${item.priceAmount.toLocaleString('ro-RO')} ${item.priceCurrency || 'RON'}`
                : 'Preț la cerere'}
            </Text>

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.primaryAction}
                onPress={() => {
                  trackEvent('view_listing', { listingId: item.id, source: 'home_details_button' }).catch(() => {});
                  onOpenListing(item.id);
                }}
              >
                <Text style={styles.primaryActionText}>Vezi detalii</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => {
                  trackEvent('contact_seller', { listingId: item.id, source: 'home_contact_button' }).catch(() => {});
                  onOpenListing(item.id);
                }}
              >
                <Text style={styles.secondaryActionText}>Contact</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>
                {searchQuery.trim().length >= 2
                  ? 'Niciun rezultat pentru căutare.'
                  : selectedCategory === 'all'
                    ? 'Nu există anunțuri disponibile.'
                    : 'Nu există anunțuri în această categorie.'}
              </Text>
              <Pressable style={styles.emptyCta} onPress={onOpenCreateListing}>
                <Text style={styles.emptyCtaText}>Publică primul anunț</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  searchInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    color: THEME.colors.textPrimary,
    fontSize: 15,
  },
  publishButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...THEME.shadow.card,
  },
  publishIconWrap: {
    width: 30,
    height: 30,
    borderRadius: THEME.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryStrong,
  },
  publishTextWrap: {
    flex: 1,
  },
  publishTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  publishSubtitle: {
    marginTop: 1,
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  categoriesRow: {
    marginTop: 10,
    paddingRight: 4,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    maxWidth: 220,
    height: 34,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  categoryTabActive: {
    backgroundColor: THEME.colors.surfaceAlt,
    borderColor: THEME.colors.accent,
  },
  categoryIconWrap: {
    width: 22,
    height: 22,
    borderRadius: THEME.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
  },
  categoryIconWrapActive: {
    backgroundColor: 'rgba(0,209,255,0.14)',
  },
  categoryText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  categoryTextActive: {
    color: THEME.colors.textPrimary,
  },
  listContent: { paddingHorizontal: 10, paddingBottom: 12, gap: 8 },
  columnWrapper: { gap: 8 },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 8,
    gap: 4,
    ...THEME.shadow.card,
  },
  coverImage: {
    height: 86,
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: THEME.radius.pill,
    backgroundColor: 'rgba(0,209,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,209,255,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: THEME.colors.accent,
    fontWeight: '700',
    fontSize: 10,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: THEME.colors.textPrimary },
  secondaryLine: { fontSize: 11, color: THEME.colors.textSecondary, fontWeight: '600' },
  meta: { color: THEME.colors.textMuted, fontSize: 11 },
  price: { fontWeight: '800', color: THEME.colors.accent, fontSize: 14 },
  actionsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 6,
  },
  primaryAction: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.primaryStrong,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryAction: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  secondaryActionText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  error: { color: THEME.colors.error, paddingHorizontal: 12, paddingTop: 12 },
  offlineHint: { color: THEME.colors.warning, paddingHorizontal: 12, paddingBottom: 6, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 32 },
  empty: { color: THEME.colors.textMuted, textAlign: 'center', marginTop: 32 },
  emptyCta: {
    marginTop: 10,
    height: 36,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  emptyCtaText: { color: THEME.colors.textPrimary, fontWeight: '700', fontSize: 12 },
});
