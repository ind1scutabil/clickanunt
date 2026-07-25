import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import type { Prisma } from "@prisma/client";
import { activePublicListingExpiryWhere } from "@/lib/listing-expiry";
import { primarySlugForCategoryLabel } from '@/lib/seo/market-paths';
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
