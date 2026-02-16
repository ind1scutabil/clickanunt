/**
 * API Route: Dashboard Stats
 * Returns user dashboard statistics (listings, views, messages, favorites)
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    // Get real stats from database
    const [activeListingsCount, userListings] = await Promise.all([
      // Active listings count
      prisma.listing.count({
        where: {
          ownerUserId: user.id,
          status: 'active',
        },
      }),
      
      // Get all user listings to calculate total views
      prisma.listing.findMany({
        where: {
          ownerUserId: user.id,
        },
        select: {
          views: true,
        },
      }),
    ]);

    // Calculate total views across all user listings
    const totalViews = userListings.reduce((sum: number, listing: any) => sum + (listing.views || 0), 0);

    // For now, return 0 for messages and favorites since models don't exist yet
    // TODO: Implement when Favorite and Message models are added to schema
    const unreadMessagesCount = 0;
    const favoritesCount = 0;

    return NextResponse.json({
      success: true,
      stats: {
        activeListings: activeListingsCount,
        totalViews: totalViews,
        messages: unreadMessagesCount,
        favorites: favoritesCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la obținerea statisticilor" },
      { status: 500 }
    );
  }
}
