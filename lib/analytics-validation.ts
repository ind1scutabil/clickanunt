/**
 * Cross-check analytics_events vs authoritative DB tables; log when discrepancy > threshold.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";

const THRESHOLD_PERCENT = 5;

export type AnalyticsMetricCheck = {
  name: string;
  dbCount: number;
  eventCount: number;
  discrepancyPercent: number | null;
  exceedsThreshold: boolean;
};

function discrepancyPct(db: number, ev: number): { pct: number | null; bad: boolean } {
  const max = Math.max(db, ev, 1);
  if (db === 0 && ev === 0) return { pct: 0, bad: false };
  const pct = (Math.abs(db - ev) / max) * 100;
  return { pct, bad: pct > THRESHOLD_PERCENT };
}

export async function runAnalyticsMetricsValidation(input: {
  sinceMessages?: Date;
  sinceListings?: Date;
  sinceFavorites?: Date;
}): Promise<{ checks: AnalyticsMetricCheck[]; anyExceeded: boolean }> {
  const since24h = input.sinceMessages ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d =
    input.sinceListings ??
    input.sinceFavorites ??
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    messagesDb,
    messagesEv,
    listingsDb,
    listingsEv,
    favDb,
    favEv,
  ] = await Promise.all([
    prisma.message.count({ where: { createdAt: { gte: since24h } } }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.message_sent,
        createdAt: { gte: since24h },
      },
    }),
    prisma.listing.count({ where: { createdAt: { gte: since7d } } }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_created,
        createdAt: { gte: since7d },
      },
    }),
    prisma.favorite.count({ where: { createdAt: { gte: since7d } } }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_favorite_added,
        createdAt: { gte: since7d },
      },
    }),
  ]);

  const checks: AnalyticsMetricCheck[] = [];

  const push = (name: string, db: number, ev: number) => {
    const { pct, bad } = discrepancyPct(db, ev);
    checks.push({
      name,
      dbCount: db,
      eventCount: ev,
      discrepancyPercent: pct,
      exceedsThreshold: bad,
    });
  };

  push("messages_vs_message_sent_24h", messagesDb, messagesEv);
  push("listings_created_vs_listing_created_7d", listingsDb, listingsEv);
  push("favorites_vs_favorite_added_7d", favDb, favEv);

  const anyExceeded = checks.some((c) => c.exceedsThreshold);

  for (const c of checks) {
    if (c.exceedsThreshold) {
      logger.warn("[analytics-validation] Metric discrepancy exceeds threshold", {
        name: c.name,
        dbCount: c.dbCount,
        eventCount: c.eventCount,
        discrepancyPercent: c.discrepancyPercent,
        thresholdPercent: THRESHOLD_PERCENT,
      });
    }
  }

  return { checks, anyExceeded };
}
