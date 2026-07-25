/**
 * Active listing counts per category (public). Used by homepage category cards — no invented totals.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";

export async function GET() {
  try {
    const rows = await prisma.listing.groupBy({
      by: ["category"],
      where: seoIndexableListingWhere(),
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.category] = row._count._all;
    }

    return NextResponse.json({ counts });
  } catch (err) {
    logger.error("GET /api/stats/by-category failed", { err });
    return NextResponse.json(
      { error: "stats_unavailable", counts: {} },
      { status: 503 }
    );
  }
}
