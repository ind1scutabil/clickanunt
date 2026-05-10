import { cache } from 'react';
import { prisma } from '@/lib/prisma';
/** Active public listings usable for hubs & sitemap (consistent with ListingJsonLd). */
const hubWhereBase = {
  status: 'active' as const,
  deletedAt: null,
};

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
