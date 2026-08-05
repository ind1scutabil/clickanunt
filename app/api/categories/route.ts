/**
 * GET /api/categories
 * DB-backed categories (public): active listings per category string, sorted by count desc.
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

    const categories = rows
      .map((row) => ({
        key: row.category,
        label: row.category,
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ categories });
  } catch (err) {
    logger.error("GET /api/categories failed", { err });
    return NextResponse.json(
      { error: "categories_unavailable", categories: [] },
      { status: 503 }
    );
  }
}
