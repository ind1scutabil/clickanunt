/**
 * Server-side homepage stats (shared with GET /api/stats* — avoids duplicate client fetches).
 */

import { prisma } from '@/lib/prisma';

export type HomePageInitialStats = {
  activeListings: number;
  categoryCounts: Record<string, number>;
};

export async function getHomePageInitialStats(): Promise<HomePageInitialStats> {
  const [activeListings, rows] = await Promise.all([
    prisma.listing.count({
      where: { status: 'active', deletedAt: null },
    }),
    prisma.listing.groupBy({
      by: ['category'],
      where: { status: 'active', deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const categoryCounts: Record<string, number> = {};
  for (const row of rows) {
    categoryCounts[row.category] = row._count._all;
  }

  return { activeListings, categoryCounts };
}
