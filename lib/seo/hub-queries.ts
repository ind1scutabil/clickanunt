import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/** Hubs, stats & internal linking — same visibility rules as public browse (approved + active). */
export const hubWhereBase = {
  status: 'active' as const,
  deletedAt: null,
  moderationStatus: 'approved' as const,
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

export const getActiveListingCountForHub = cache(async (category: string, city?: string): Promise<number> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') return 0;
  return prisma.listing.count({
    where: {
      ...hubWhereBase,
      category,
      ...(city ? { city } : {}),
    },
  });
});

export type ListingPreviewMini = { id: string; title: string };

export const getListingPreviewsForHub = cache(
  async (category: string, city: string | undefined, take: number): Promise<ListingPreviewMini[]> => {
    if (process.env.USE_IN_MEMORY_DB === 'true') return [];
    const rows = await prisma.listing.findMany({
      where: {
        ...hubWhereBase,
        category,
        ...(city ? { city } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take,
      select: { id: true, title: true },
    });
    return rows;
  },
);
