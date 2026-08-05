import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { Prisma } from "@prisma/client";
import { activePublicListingExpiryWhere } from "@/lib/listing-expiry";
import { primarySlugForCategoryLabel, resolveCityLabelFromSlug } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';
import { MIN_INDEXABLE_HUB_LISTINGS } from '@/lib/seo/hub-index-policy';

/** Shared Prisma filter: active, approved, non-deleted, non-expired (hubs, stats, internal links). */
export const hubWhereBase: Prisma.ListingWhereInput = {
  status: "active",
  deletedAt: null,
  moderationStatus: "approved",
  AND: [activePublicListingExpiryWhere()],
};

export type HubListingStats = {
  count: number;
  avgPriceAmount: number | null;
  minPriceAmount: number | null;
  maxPriceAmount: number | null;
  sampleCurrency: string;
};

export const getHubListingStats = cache(async (category: string, city?: string): Promise<HubListingStats | null> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return null;
  const where = {
    ...hubWhereBase,
    category,
    ...(city ? { city } : {}),
  };
  const [count, agg, sample] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.aggregate({
      where,
      _avg: { priceAmount: true },
      _min: { priceAmount: true },
      _max: { priceAmount: true },
    }),
    prisma.listing.findFirst({ where, select: { priceCurrency: true } }),
  ]);
  return {
    count,
    avgPriceAmount: agg._avg.priceAmount,
    minPriceAmount: agg._min.priceAmount,
    maxPriceAmount: agg._max.priceAmount,
    sampleCurrency: sample?.priceCurrency?.trim() || 'RON',
  };
});

export const getActiveListingCountForHub = cache(async (category: string, city?: string, subcategory?: string): Promise<number> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return 0;
  return prisma.listing.count({
    where: {
      ...hubWhereBase,
      category,
      ...(city ? { city } : {}),
      ...(subcategory ? { subcategory } : {}),
    },
  });
});

export type ListingPreviewMini = { id: string; title: string };

export const getListingPreviewsForHub = cache(
  async (category: string, city: string | undefined, take: number, subcategory?: string): Promise<ListingPreviewMini[]> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return [];
    const rows = await prisma.listing.findMany({
      where: {
        ...hubWhereBase,
        category,
        ...(city ? { city } : {}),
        ...(subcategory ? { subcategory } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take,
      select: { id: true, title: true },
    });
    return rows;
  },
);

/** Cities with ≥1 indexable listing in category — for hub links (no empty city hubs). */
export const getHubCitiesForCategory = cache(async (category: string, limit = 12): Promise<string[]> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];
  const grouped = await prisma.listing.groupBy({
    by: ['city'],
    where: {
      ...hubWhereBase,
      category,
      city: { not: null },
    },
    _count: { _all: true },
  });
  return grouped
    .filter((r) => r.city && r._count._all >= MIN_INDEXABLE_HUB_LISTINGS)
    .sort((a, b) => b._count._all - a._count._all)
    .map((r) => r.city!)
    .slice(0, limit);
});

export type CategoryCityHubRow = { categoryLabel: string; categorySlug: string; city: string; citySlug: string };

/** Category×city pairs with ≥1 public listing — HTML sitemap / harta site. */
export const getCategoryCityHubIndex = cache(async (): Promise<CategoryCityHubRow[]> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];

  const byPair = await prisma.listing.groupBy({
    by: ['category', 'city'],
    where: {
      ...hubWhereBase,
      city: { not: null },
    },
    _count: { _all: true },
  });

  const out: CategoryCityHubRow[] = [];
  for (const row of byPair) {
    if (!row.city || row._count._all < MIN_INDEXABLE_HUB_LISTINGS) continue;
    const slug = primarySlugForCategoryLabel(row.category);
    if (!slug) continue;
    out.push({
      categoryLabel: row.category,
      categorySlug: slug,
      city: row.city,
      citySlug: slugifyRo(row.city),
    });
  }
  return out.sort((a, b) => a.categorySlug.localeCompare(b.categorySlug) || a.city.localeCompare(b.city));
});

/**
 * Fallback slug → real city label map, built from distinct `Listing.city`
 * values that fall outside the static `MARKETPLACE_SEO_CITIES` allowlist.
 *
 * The city field is free text server-side (`z.string().min(1).max(100)`,
 * not constrained to the picker list — see `lib/security/validation-schemas.ts`),
 * so a listing published outside the standard county/city picker could
 * otherwise have real inventory but no working hub URL (permanent 404),
 * contradicting "one hub per category×city with ≥1 active listing".
 * Cached and revalidated periodically — this only ever widens resolution,
 * it never changes the (unchanged) indexing/sitemap threshold.
 */
const loadDbCitySlugMapSafe = async (): Promise<Record<string, string>> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return {};
  try {
    const rows = await prisma.listing.groupBy({
      by: ['city'],
      where: { ...hubWhereBase, city: { not: null } },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      const city = row.city?.trim();
      if (!city) continue;
      map[slugifyRo(city).toLowerCase()] = city;
    }
    return map;
  } catch (err) {
    console.error('[hub-queries] db city slug map failed; falling back to static list only', {
      name: err instanceof Error ? err.name : 'unknown',
    });
    return {};
  }
};

const loadDbCitySlugMapCached = unstable_cache(loadDbCitySlugMapSafe, ['hub-city-slug-map-v1'], {
  revalidate: 300,
  tags: ['hub-city-slug-map'],
});

/**
 * Resolve a city slug to its real display label for hub routing. Tries the
 * static SEO allowlist first (fast, no DB); only queries the DB fallback map
 * when the slug isn't in the static list, so the common case stays free.
 *
 * `loadCityMap` is injectable so tests can bypass `unstable_cache` (which
 * requires a live Next.js request/data-cache context and throws under Jest) —
 * production call sites always use the default cached loader.
 *
 * Cache staleness note (support-relevant): `loadDbCitySlugMapCached` above
 * revalidates every 300s (5 min). If a listing is published in a brand-new
 * city (not in the static allowlist), its hub URL can 404 for up to 5
 * minutes, or until the next server/PM2 restart, until the cache picks up
 * the new distinct `Listing.city` value. This is intentional cache
 * behavior, not a bug — but if a seller reports "orașul meu de hub nu
 * apare imediat", check whether the listing is younger than the cache
 * window before treating it as a defect.
 */
export async function resolveCityLabelForHub(
  citySlug: string,
  loadCityMap: () => Promise<Record<string, string>> = loadDbCitySlugMapCached,
): Promise<string | null> {
  const fromStatic = resolveCityLabelFromSlug(citySlug);
  if (fromStatic) return fromStatic;
  const dbMap = await loadCityMap();
  return dbMap[citySlug.toLowerCase()] ?? null;
}

/** Test seam: invoke the fail-soft DB city map loader without `unstable_cache`. */
export async function loadDbCitySlugMapForTest(): Promise<Record<string, string>> {
  return loadDbCitySlugMapSafe();
}
