import type { Prisma } from "@prisma/client";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";

/** Events with browser analytics session — best proxy for human views. */
export function listingViewAttributedWhere(
  since: Date
): Prisma.AnalyticsEventWhereInput {
  return {
    eventType: ANALYTICS_EVENT.listing_view,
    createdAt: { gte: since },
    sessionId: { not: null },
  };
}

/** Events without session (bots, scripts) — excluded from seller charts. */
export function listingViewUnattributedWhere(
  since: Date
): Prisma.AnalyticsEventWhereInput {
  return {
    eventType: ANALYTICS_EVENT.listing_view,
    createdAt: { gte: since },
    sessionId: null,
  };
}
