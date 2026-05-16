/**
 * API Route: Dashboard Stats
 * Returns user dashboard statistics (listings, views, messages, favorites)
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { totalViewsFromAggregate } from "@/lib/dashboard-stats";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const startOfTodayUtc = new Date();
    startOfTodayUtc.setUTCHours(0, 0, 0, 0);

    const [activeListingsCount, viewsAggregate, favoritesCount, unreadMessagesCount] =
      await Promise.all([
        prisma.listing.count({
          where: {
            ownerUserId: user.id,
            status: "active",
          },
        }),
        prisma.listing.aggregate({
          where: { ownerUserId: user.id },
          _sum: { views: true },
        }),
        prisma.favorite.count({ where: { userId: user.id } }),
        prisma.message.count({
          where: { receiverId: user.id, isRead: false },
        }),
      ]);

    const totalViews = totalViewsFromAggregate(viewsAggregate._sum);

    const start7d = new Date(startOfTodayUtc);
    start7d.setUTCDate(start7d.getUTCDate() - 6);

    let viewRows: Array<{ d: Date; c: bigint }> = [];
    try {
      viewRows = await prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
      SELECT (DATE_TRUNC('day', e."createdAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
      FROM "analytics_events" e
      INNER JOIN "listings" l ON l.id = e."listingId"
      WHERE e."eventType" = ${ANALYTICS_EVENT.listing_view}
        AND l."ownerUserId" = ${user.id}
        AND e."createdAt" >= ${start7d}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    } catch {
      /** Tabel lipsă / migrare incompletă: grafic 7 zile rămâne gol, KPI-urile principale merg înainte */
      viewRows = [];
    }

    const byDay = new Map<string, number>();
    for (const row of viewRows) {
      const key =
        row.d instanceof Date
          ? row.d.toISOString().slice(0, 10)
          : String(row.d).slice(0, 10);
      byDay.set(key, Number(row.c));
    }

    const viewsLast7Days: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfTodayUtc);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      viewsLast7Days.push({ date: key, views: byDay.get(key) ?? 0 });
    }

    return NextResponse.json({
      success: true,
      stats: {
        activeListings: activeListingsCount,
        totalViews,
        totalViewsSource: "listing_views_counter",
        viewsLast7DaysSource: "analytics_events_listing_view",
        messages: unreadMessagesCount,
        favorites: favoritesCount,
        viewsLast7Days,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la obținerea statisticilor" },
      { status: 500 }
    );
  }
}
