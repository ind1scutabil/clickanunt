/**
 * Daily publish quota — counts only successful publishes (active/pending), not drafts.
 * Debug: LISTING_PUBLISH_QUOTA_DEBUG=1
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import {
  LISTING_PUBLISH_WINDOW_MS,
  listingPublishMaxForRole,
} from '@/lib/listing-publish-rate-limit';

/** Statuses that represent a real publish attempt (not draft/autosave). */
export const LISTING_PUBLISH_QUOTA_STATUSES = ['active', 'pending'] as const;

export async function countSuccessfulPublishesLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - LISTING_PUBLISH_WINDOW_MS);
  return prisma.listing.count({
    where: {
      ownerUserId: userId,
      createdAt: { gte: since },
      status: { in: [...LISTING_PUBLISH_QUOTA_STATUSES] },
      deletedAt: null,
    },
  });
}

export function logListingPublishQuotaDebug(params: {
  userId: string;
  limiterKey: string;
  currentCount: number;
  limit: number;
  route: string;
  source: string;
}): void {
  if (process.env.LISTING_PUBLISH_QUOTA_DEBUG !== '1') return;
  logger.info('[listing-publish-quota]', {
    ...params,
    timestamp: new Date().toISOString(),
  });
}

export async function assertDailyPublishQuotaAllowed(
  userId: string,
  role: string | null | undefined,
  route: string,
  source: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  // Same local E2E flag as IP rate limiters — publish suites create dozens of
  // listings per run and must not hit the 24h product quota on a shared fixture user.
  if (process.env.E2E_DISABLE_RATE_LIMIT === '1') {
    const count = await countSuccessfulPublishesLast24h(userId);
    logListingPublishQuotaDebug({
      userId,
      limiterKey: `listing:publish:${userId}`,
      currentCount: count,
      limit: Number.MAX_SAFE_INTEGER,
      route,
      source: `${source}:e2e_bypass`,
    });
    return { allowed: true, count, limit: Number.MAX_SAFE_INTEGER };
  }

  const limit = listingPublishMaxForRole(role);
  const count = await countSuccessfulPublishesLast24h(userId);
  const limiterKey = `listing:publish:${userId}`;

  logListingPublishQuotaDebug({
    userId,
    limiterKey,
    currentCount: count,
    limit,
    route,
    source,
  });

  return { allowed: count < limit, count, limit };
}
