/**
 * Orphan analytics_events detection and cleanup (referential hygiene).
 */

import { prisma } from "@/lib/prisma";

export type AnalyticsOrphanCounts = {
  orphanListingRefs: number;
  orphanUserRefs: number;
  orphanSessionRefs: number;
};

export async function countAnalyticsOrphans(): Promise<AnalyticsOrphanCounts> {
  const [orphanListingRefs, orphanUserRefs, orphanSessionRefs] = await Promise.all([
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM "analytics_events" e
      WHERE e."listingId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "listings" l WHERE l.id = e."listingId")
    `,
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM "analytics_events" e
      WHERE e."userId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = e."userId")
    `,
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM "analytics_events" e
      WHERE e."sessionId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "analytics_sessions" s WHERE s.id = e."sessionId")
    `,
  ]);

  return {
    orphanListingRefs: Number(orphanListingRefs[0]?.c ?? 0),
    orphanUserRefs: Number(orphanUserRefs[0]?.c ?? 0),
    orphanSessionRefs: Number(orphanSessionRefs[0]?.c ?? 0),
  };
}

export async function deleteAnalyticsOrphans(): Promise<{
  deleted: AnalyticsOrphanCounts;
  remaining: AnalyticsOrphanCounts;
}> {
  const before = await countAnalyticsOrphans();

  await prisma.$executeRaw`
    DELETE FROM "analytics_events" e
    WHERE e."listingId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "listings" l WHERE l.id = e."listingId")
  `;
  await prisma.$executeRaw`
    DELETE FROM "analytics_events" e
    WHERE e."userId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = e."userId")
  `;
  await prisma.$executeRaw`
    DELETE FROM "analytics_events" e
    WHERE e."sessionId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "analytics_sessions" s WHERE s.id = e."sessionId")
  `;

  const remaining = await countAnalyticsOrphans();
  return {
    deleted: {
      orphanListingRefs: before.orphanListingRefs - remaining.orphanListingRefs,
      orphanUserRefs: before.orphanUserRefs - remaining.orphanUserRefs,
      orphanSessionRefs: before.orphanSessionRefs - remaining.orphanSessionRefs,
    },
    remaining,
  };
}
