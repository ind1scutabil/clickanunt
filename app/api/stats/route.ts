/**
 * API Route: Public Platform Stats
 * Provides lightweight stats for enterprise UI widgets.
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [activeListings, totalUsers, averageRatingAggregate] = await Promise.all([
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
    ]);

    return NextResponse.json({
      activeListings: activeListings ?? 0,
      totalUsers: totalUsers ?? 0,
      monthlyVisitors: 0,
      averageRating: averageRatingAggregate._avg.averageRating ?? 0,
    });
  } catch {
    return NextResponse.json({
      activeListings: 0,
      totalUsers: 0,
      monthlyVisitors: 0,
      averageRating: 0,
    });
  }
}
