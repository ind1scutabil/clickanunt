import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import type { SitemapEntry } from '@/lib/seo';
import { siteOriginForSeoFeeds } from '@/lib/seo/site-url-guard';
import { hubWhereBase, type HubListingStats, type ListingPreviewMini } from '@/lib/seo/hub-queries';
import {
  AUTO_HUB_INDEX_THRESHOLDS,
  type AutoHubLevel,
} from '@/lib/seo/sitemap-constants';
import {
  AUTO_CATEGORY_LABEL,
  autoMakeSlug,
  autoModelSlug,
  buildAutoMakeHubPath,
  buildAutoModelCityHubPath,
  buildAutoModelHubPath,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
} from '@/lib/seo/auto-hub-resolve';
import { slugifyRo } from '@/lib/seo/slug';

export type AutoHubIndexMode = 'index' | 'noindex' | 'notFound';

export function autoHubIndexMode(count: number, level: AutoHubLevel): AutoHubIndexMode {
  const min = AUTO_HUB_INDEX_THRESHOLDS[level];
  if (count <= 0) return 'notFound';
  if (count < min) return 'noindex';
  return 'index';
}

function autoListingWhere(parts: { make?: string; model?: string; city?: string }) {
  return {
    ...hubWhereBase,
    category: AUTO_CATEGORY_LABEL,
    ...(parts.make
      ? { make: { equals: parts.make, mode: 'insensitive' as const } }
      : {}),
    ...(parts.model
      ? { model: { equals: parts.model, mode: 'insensitive' as const } }
      : {}),
    ...(parts.city
      ? { city: { equals: parts.city, mode: 'insensitive' as const } }
      : {}),
  };
}

export const getAutoHubListingCount = cache(
  async (parts: { make?: string; model?: string; city?: string }): Promise<number> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return 0;
    return prisma.listing.count({ where: autoListingWhere(parts) });
  },
);

export const getAutoHubListingStats = cache(
  async (parts: { make?: string; model?: string; city?: string }): Promise<HubListingStats | null> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return null;
    const where = autoListingWhere(parts);
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
  },
);

export const getAutoHubListingPreviews = cache(
  async (
    parts: { make?: string; model?: string; city?: string },
    take: number,
  ): Promise<ListingPreviewMini[]> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return [];
    return prisma.listing.findMany({
      where: autoListingWhere(parts),
      orderBy: [{ isPromoted: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      take,
      select: { id: true, title: true },
    });
  },
);

export type AutoMakeInventoryRow = { make: string; count: number };

export const getAutoMakesWithInventory = cache(async (minCount = 1): Promise<AutoMakeInventoryRow[]> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];
  const grouped = await prisma.listing.groupBy({
    by: ['make'],
    where: { ...hubWhereBase, category: AUTO_CATEGORY_LABEL, make: { not: null } },
    _count: { _all: true },
  });
  return grouped
    .filter((r) => r.make && r._count._all >= minCount)
    .map((r) => ({ make: r.make!, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
});

export type AutoModelInventoryRow = { model: string; count: number };

export const getAutoModelsWithInventory = cache(
  async (make: string, minCount = 1): Promise<AutoModelInventoryRow[]> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return [];
    const grouped = await prisma.listing.groupBy({
      by: ['model'],
      where: {
        ...hubWhereBase,
        category: AUTO_CATEGORY_LABEL,
        make: { equals: make, mode: 'insensitive' },
        model: { not: null },
      },
      _count: { _all: true },
    });
    return grouped
      .filter((r) => r.model && r._count._all >= minCount)
      .map((r) => ({ model: r.model!, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
  },
);

export type AutoModelCityInventoryRow = { city: string; count: number };

export const getAutoModelCitiesWithInventory = cache(
  async (make: string, model: string, minCount = 1): Promise<AutoModelCityInventoryRow[]> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return [];
    const grouped = await prisma.listing.groupBy({
      by: ['city'],
      where: {
        ...hubWhereBase,
        category: AUTO_CATEGORY_LABEL,
        make: { equals: make, mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' },
        city: { not: null },
      },
      _count: { _all: true },
    });
    return grouped
      .filter((r) => r.city && r._count._all >= minCount)
      .map((r) => ({ city: r.city!, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
  },
);

/** Sitemap URLs for make / model / model+city hubs meeting index thresholds. */
export async function buildAutoHubSitemapEntries(): Promise<SitemapEntry[]> {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];

  const now = new Date();
  const base = siteOriginForSeoFeeds();
  const out: SitemapEntry[] = [];
  const seen = new Set<string>();

  const push = (path: string, priority: number) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority,
    });
  };

  const makes = await getAutoMakesWithInventory(AUTO_HUB_INDEX_THRESHOLDS.make);
  for (const { make, count: makeCount } of makes) {
    const catalogMake = resolveAutoMakeFromSlug(autoMakeSlug(make)) ?? make;
    if (autoHubIndexMode(makeCount, 'make') !== 'index') continue;
    push(buildAutoMakeHubPath(catalogMake), 0.74);

    const models = await getAutoModelsWithInventory(make, AUTO_HUB_INDEX_THRESHOLDS.model);
    for (const { model, count: modelCount } of models) {
      const resolvedModel = resolveAutoModelFromSlug(catalogMake, autoModelSlug(model)) ?? model;
      if (autoHubIndexMode(modelCount, 'model') !== 'index') continue;
      push(buildAutoModelHubPath(catalogMake, resolvedModel), 0.72);

      const cities = await getAutoModelCitiesWithInventory(
        make,
        model,
        AUTO_HUB_INDEX_THRESHOLDS.modelCity,
      );
      for (const { city, count: cityCount } of cities) {
        if (autoHubIndexMode(cityCount, 'modelCity') !== 'index') continue;
        push(buildAutoModelCityHubPath(catalogMake, resolvedModel, city), 0.7);
      }
    }
  }

  return out;
}
