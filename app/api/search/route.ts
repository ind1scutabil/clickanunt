import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseAndValidateQuery } from "@/lib/security/validation-schemas";
import { getUserFromRequest } from "@/lib/auth";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { buildRomanianTsQuery, ftsSearchListingIds } from "@/lib/listing-fts-query";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";

/**
 * @deprecated Prefer `GET /api/listings?q=…` for full listing rows + shared filters/sort.
 * This route returns a slim `SearchResponseDto` for backward compatibility; it uses the same FTS engine as `/api/listings`.
 */
const searchSchema = z.object({
  q: z.string().min(2).max(200),
  category: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  minPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  page: z.coerce.number().int().min(1).max(50).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseAndValidateQuery(searchParams, searchSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error || "Invalid query" }, { status: 400 });
    }

    if (!parsed.data) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const { q, category, city, year, minPrice, maxPrice, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    if (typeof minPrice === "number" && typeof maxPrice === "number" && minPrice > maxPrice) {
      return NextResponse.json({ error: "minPrice cannot be greater than maxPrice" }, { status: 400 });
    }

    const tsq = buildRomanianTsQuery(q);
    if (!tsq) {
      return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
    }

    const { ids, ranks, total } = await ftsSearchListingIds(
      prisma,
      tsq,
      {
        activeOnly: true,
        category: category ?? null,
        city: city ?? null,
        year: typeof year === "number" ? year : null,
        minPrice: typeof minPrice === "number" ? minPrice : null,
        maxPrice: typeof maxPrice === "number" ? maxPrice : null,
      },
      limit,
      offset
    );

    const rows =
      ids.length === 0
        ? []
        : await prisma.listing.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              title: true,
              category: true,
              priceAmount: true,
              priceCurrency: true,
              city: true,
              county: true,
              photos: true,
              createdAt: true,
              isPromoted: true,
            },
          });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const results = ids
      .map((id, i) => {
        const row = byId.get(id);
        if (!row) return null;
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          priceAmount: row.priceAmount,
          priceCurrency: row.priceCurrency,
          city: row.city,
          county: row.county,
          photos: normalizeListingPhotosArray(row.photos),
          createdAt: row.createdAt.toISOString(),
          isPromoted: row.isPromoted,
          rank: ranks[i] ?? 0,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const viewer = await getUserFromRequest(request);
    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.search_performed,
      userId: viewer?.id ?? null,
      metadata: {
        q: q.slice(0, 200),
        resultCount: total,
        category: category ?? null,
        city: city ?? null,
        page,
      },
      request,
    });

    return NextResponse.json(
      {
        results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          Deprecation: "true",
          Link: '</api/listings>; rel="successor-version"',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Search failed", details: message }, { status: 500 });
  }
}
