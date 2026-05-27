/**
 * API Route: Public Platform Stats
 * Provides lightweight stats for enterprise UI widgets.
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  listingViewAttributedWhere,
  listingViewUnattributedWhere,
} from "@/lib/analytics-listing-view-stats";
import { logger } from "@/lib/observability";

export async function GET() {
  try {
    const start30 = new Date();
    start30.setUTCDate(start30.getUTCDate() - 30);

    const [
      activeListings,
      totalUsers,
      averageRatingAggregate,
      listingViewsLast30dAttributed,
      listingViewsLast30dUnattributed,
    ] = await Promise.all([
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
        where: listingViewAttributedWhere(start30),
      }),
      prisma.analyticsEvent.count({
        where: listingViewUnattributedWhere(start30),
      }),
    ]);

    const attributed = listingViewsLast30dAttributed ?? 0;
    const unattributed = listingViewsLast30dUnattributed ?? 0;

    return NextResponse.json({
      available: true,
      activeListings: activeListings ?? 0,
      totalUsers: totalUsers ?? 0,
      listingViewsLast30d: attributed + unattributed,
      listingViewsLast30dAttributed: attributed,
      listingViewsLast30dUnattributed: unattributed,
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
