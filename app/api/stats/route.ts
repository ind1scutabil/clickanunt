/**
 * API Route: Public Platform Stats
 * Provides lightweight stats for enterprise UI widgets.
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { logger } from "@/lib/observability";

export async function GET() {
  try {
    const start30 = new Date();
    start30.setUTCDate(start30.getUTCDate() - 30);

    const [activeListings, totalUsers, averageRatingAggregate, listingViewsLast30d] =
      await Promise.all([
        prisma.listing.count({
          where: {
            status: "active",
          },
        }),
        prisma.user.count(),
        prisma.user.aggregate({
          _avg: {
            averageRating: true,
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            eventType: ANALYTICS_EVENT.listing_view,
            createdAt: { gte: start30 },
          },
        }),
      ]);

    return NextResponse.json({
      available: true,
      activeListings: activeListings ?? 0,
      totalUsers: totalUsers ?? 0,
      listingViewsLast30d: listingViewsLast30d ?? 0,
      averageRating: averageRatingAggregate._avg.averageRating ?? 0,
    });
  } catch (err) {
    logger.error("GET /api/stats failed", { err });
    return NextResponse.json(
      {
        available: false,
        error: "stats_unavailable",
        message: "Statisticile platformei nu sunt disponibile momentan.",
      },
      { status: 503 }
    );
  }
}
