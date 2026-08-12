import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  categoriesApi,
  getLastDataSource,
  listingsApi,
  listingsBrowseQueryString,
} from '../api/client';
import { mergeListingsByIdUnique } from '../api/listingsBrowseQuery';
import { OptionSelect } from '../components/OptionSelect';
import { ListingPhotoImage } from '../components/ListingPhotoImage';
import { subcategoriesForCategory } from '../constants/categoryOptions';
import {
  AUTO_CATEGORY_LABEL,
  CAR_MAKES_AND_MODELS,
  CITIES_BY_COUNTY,
  ROMANIAN_COUNTIES,
} from '../constants/locationMakeOptions';
import { useLiveSync } from '../hooks/useLiveSync';
import { addBreadcrumb, trackEvent } from '../telemetry';
import { THEME } from '../theme';
import { listingOwnerId } from '../types';
import type { Listing } from '../types';

type Props = {
  onOpenListing: (listingId: string) => void;
  onOpenCreateListing: () => void;
  onContactSeller: (params: { userId: string; listingId: string; title: string }) => void;
};

type CategoryTab = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; count?: number };

type SortValue = 'newest' | 'priceAsc' | 'priceDesc' | 'featured';

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: 'newest', label: 'Cele mai noi' },
  { value: 'priceAsc', label: 'Preț crescător' },
  { value: 'priceDesc', label: 'Preț descrescător' },
  { value: 'featured', label: 'Promovate' },
];

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
const PAGE_SIZE = 24;

export function HomeScreen({
  onOpenListing,
  onOpenCreateListing,
  onContactSeller,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<SortValue>('newest');
  const [county, setCounty] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>(DEFAULT_TABS);
  const [offlineMode, setOfflineMode] = useState(false);
  const listRef = useRef<FlatList<Listing> | null>(null);
  const savedOffset = useRef(0);
  const loadingLock = useRef(false);
  /** Monotonic id so a newer replace/reload always wins over an in-flight request. */
  const loadGeneration = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

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

  const cityOptions = useMemo(
    () => (county && CITIES_BY_COUNTY[county as keyof typeof CITIES_BY_COUNTY]
      ? CITIES_BY_COUNTY[county as keyof typeof CITIES_BY_COUNTY]
      : []),
    [county]
  );

  /**
   * Categories API returns key === label (DB category string). Listings `category`
   * query expects that same label string (web ListingsView).
   */
  const categoryLabelForApi = selectedCategory === 'all' ? '' : selectedCategory;
  const subcategoryOptions = useMemo(
    () => (categoryLabelForApi ? subcategoriesForCategory(categoryLabelForApi) : []),
    [categoryLabelForApi]
  );
  const isAutoCategory = categoryLabelForApi === AUTO_CATEGORY_LABEL;
  const modelOptions = useMemo(
    () => (make && CAR_MAKES_AND_MODELS[make] ? CAR_MAKES_AND_MODELS[make] : []),
    [make]
  );

  const feedParamsForPage = useCallback(
    (pageNum: number) => {
      const q = debouncedQ;
      return {
        page: pageNum,
        limit: PAGE_SIZE,
        status: 'active',
        sort,
        category: categoryLabelForApi || undefined,
        subcategory: subcategory.trim() || undefined,
        make: isAutoCategory && make.trim() ? make.trim() : undefined,
        model: isAutoCategory && model.trim() ? model.trim() : undefined,
        q: q.length >= 2 ? q : undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
      };
    },
    [debouncedQ, sort, categoryLabelForApi, subcategory, isAutoCategory, make, model, county, city]
  );

  const loadPage = useCallback(
    async (pageNum: number, mode: 'replace' | 'append') => {
      // Append must not pile up; replace may supersede an in-flight load so errors
      // (e.g. 429 after 500) are never left stale from a previous response.
      if (mode === 'append' && loadingLock.current) return;
      const generation = ++loadGeneration.current;
      loadingLock.current = true;
      setError(null);
      if (mode === 'replace') setRefreshing(true);
      else setLoadingMore(true);
      try {
        const feedParams = feedParamsForPage(pageNum);
        const data = await listingsApi.browsePage(feedParams);
        if (generation !== loadGeneration.current) return;
        setItems((prev) =>
          mode === 'append' ? mergeListingsByIdUnique(prev, data.listings) : data.listings
        );
        setPage(data.page);
        setHasMore(data.hasMore);
        const cacheKey = `listings.browse.${listingsBrowseQueryString(feedParams)}`;
        setOfflineMode(pageNum === 1 && getLastDataSource(cacheKey) === 'cache');
      } catch (e) {
        if (generation !== loadGeneration.current) return;
        setError(e instanceof Error ? e.message : 'Nu am putut încărca anunțurile.');
        if (mode === 'replace') {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (generation === loadGeneration.current) {
          setRefreshing(false);
          setLoadingMore(false);
          loadingLock.current = false;
        }
      }
    },
    [feedParamsForPage]
  );

  const reload = useCallback(() => loadPage(1, 'replace'), [loadPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useLiveSync(reload, { intervalMs: 12000 });

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
        <Text style={styles.headerSubtitle}>Aceleași anunțuri ca pe clickanunt.ro</Text>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.sortChip, active ? styles.sortChipActive : undefined]}
                onPress={() => setSort(opt.value)}
              >
                <Text style={[styles.sortChipText, active ? styles.sortChipTextActive : undefined]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.filtersRow}>
          <View style={styles.filterHalf}>
            <OptionSelect
              label="Județ"
              value={county}
              options={[...ROMANIAN_COUNTIES]}
              placeholder="Toate județele"
              allowClear
              onChange={(next) => {
                setCounty(next);
                setCity('');
              }}
            />
          </View>
          <View style={styles.filterHalf}>
            <OptionSelect
              label="Localitate"
              value={city}
              options={[...cityOptions]}
              placeholder={county ? 'Toate localitățile' : 'Alege județul'}
              disabled={!county}
              allowClear
              onChange={setCity}
            />
          </View>
        </View>

        {subcategoryOptions.length > 0 ? (
          <View style={styles.subcategoryWrap}>
            <OptionSelect
              label="Subcategorie"
              value={subcategory}
              options={subcategoryOptions}
              placeholder="Toate subcategoriile"
              allowClear
              onChange={setSubcategory}
            />
          </View>
        ) : null}

        {isAutoCategory ? (
          <View style={styles.filtersRow}>
            <View style={styles.filterHalf}>
              <OptionSelect
                label="Marcă"
                value={make}
                options={Object.keys(CAR_MAKES_AND_MODELS).sort((a, b) => a.localeCompare(b, 'ro'))}
                placeholder="Toate mărcile"
                allowClear
                onChange={(next) => {
                  setMake(next);
                  setModel('');
                }}
              />
            </View>
            <View style={styles.filterHalf}>
              <OptionSelect
                label="Model"
                value={model}
                options={modelOptions}
                placeholder={make ? 'Toate modelele' : 'Alege marca'}
                disabled={!make}
                allowClear
                onChange={setModel}
              />
            </View>
          </View>
        ) : null}

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
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.primary} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categoryTabs.map((tab) => {
            const active = selectedCategory === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.categoryTab, active ? styles.categoryTabActive : undefined]}
                onPress={() => {
                  // key === label from GET /api/categories — same string listings API expects
                  setSelectedCategory(tab.key);
                  setSubcategory('');
                  setMake('');
                  setModel('');
                  trackEvent('search', { mode: 'category', category: tab.key }).catch(() => {});
                }}
              >
                <View style={[styles.categoryIconWrap, active ? styles.categoryIconWrapActive : undefined]}>
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={active ? THEME.colors.primary : THEME.colors.textSecondary}
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

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void reload()}>
            <Text style={styles.retryText}>Reîncearcă</Text>
          </Pressable>
        </View>
      ) : null}
      {offlineMode ? <Text style={styles.offlineHint}>Afișăm ultimele date salvate.</Text> : null}

      <FlatList
        ref={listRef}
        key="home-grid-2"
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        onScroll={(event) => {
          savedOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (!hasMore || loadingMore || refreshing) return;
          void loadPage(page + 1, 'append');
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color={THEME.colors.primary} />
          ) : null
        }
        renderItem={({ item }) => {
          const ownerId = listingOwnerId(item);
          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                addBreadcrumb('open_listing_from_home', 'ui');
                trackEvent('view_listing', { listingId: item.id, source: 'home_card' }).catch(() => {});
                onOpenListing(item.id);
              }}
            >
              <ListingPhotoImage
                photo={item.photos?.[0]}
                variant="medium"
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

              <Text style={styles.meta} numberOfLines={1}>
                {item.city || 'Localitate neprecizată'}
                {item.county ? `, ${item.county}` : ''}
              </Text>

              <Text style={styles.price}>
                {item.priceAmount != null
                  ? `${item.priceAmount.toLocaleString('ro-RO')} ${item.priceCurrency || 'RON'}`
                  : 'Preț la cerere'}
              </Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.primaryAction}
                  onPress={() => {
                    trackEvent('view_listing', { listingId: item.id, source: 'home_details_button' }).catch(
                      () => {}
                    );
                    onOpenListing(item.id);
                  }}
                >
                  <Text style={styles.primaryActionText}>Vezi detalii</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => {
                    trackEvent('contact_seller', { listingId: item.id, source: 'home_contact_button' }).catch(
                      () => {}
                    );
                    if (ownerId) {
                      onContactSeller({
                        userId: ownerId,
                        listingId: item.id,
                        title: item.title || 'Conversație',
                      });
                      return;
                    }
                    onOpenListing(item.id);
                  }}
                >
                  <Text style={styles.secondaryActionText}>Mesaj</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>
                {debouncedQ.length >= 2
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
  sortRow: { marginTop: 8, gap: 8, paddingRight: 4 },
  sortChip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    justifyContent: 'center',
  },
  sortChipActive: {
    borderColor: 'rgba(255, 90, 0, 0.45)',
    backgroundColor: 'rgba(255, 90, 0, 0.12)',
  },
  sortChipText: { color: THEME.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  sortChipTextActive: { color: THEME.colors.textPrimary },
  filtersRow: { marginTop: 4, flexDirection: 'row', gap: 8 },
  filterHalf: { flex: 1 },
  subcategoryWrap: { marginTop: 4 },
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
    backgroundColor: 'rgba(255, 90, 0, 0.08)',
    borderColor: 'rgba(255, 90, 0, 0.32)',
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
    backgroundColor: 'rgba(255, 90, 0, 0.15)',
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
  listContent: { paddingHorizontal: 10, paddingBottom: 100, gap: 8 },
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
    backgroundColor: 'rgba(255, 90, 0, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 0, 0.30)',
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
  price: { fontWeight: '800', color: THEME.colors.primary, fontSize: 14 },
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
  },
  secondaryActionText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  errorRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  error: { flex: 1, color: THEME.colors.error },
  retryText: { color: THEME.colors.accent, fontWeight: '700' },
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
