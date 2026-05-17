/**
 * Shared PostgreSQL full-text search for listings (`search_vector`, Romanian config).
 * Used by GET /api/listings?q= and GET /api/search (legacy slim response).
 */
import type { PrismaClient } from '@prisma/client';

export function buildRomanianTsQuery(q: string): string | null {
  const words = q
    .toLowerCase()
    .match(/[0-9a-zA-Zăâîșț]+/g);
  if (!words || words.length === 0) {
    return null;
  }
  return words.map((word: string) => `${word}:*`).join(' & ');
}

export type ListingFtsFilterParams = {
  /** When false, include non-active rows (e.g. dashboard `status=all`). */
  activeOnly?: boolean;
  category?: string | null;
  subcategory?: string | null;
  county?: string | null;
  city?: string | null;
  year?: number | null;
  yearMin?: number | null;
  yearMax?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  make?: string | null;
  model?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  ownerUserId?: string | null;
};

type FtsRow = {
  id: string;
  rank: number;
};

/**
 * Returns listing ids ordered by FTS rank (same intent as legacy GET /api/search).
 * `ranks[i]` matches `ids[i]` (for slim search responses).
 */
export async function ftsSearchListingIds(
  prisma: PrismaClient,
  searchQuery: string,
  filters: ListingFtsFilterParams,
  limit: number,
  offset: number
): Promise<{ ids: string[]; ranks: number[]; total: number }> {
  const categoryParam = filters.category ?? null;
  const subcategoryParam = filters.subcategory ?? null;
  const countyParam = filters.county ?? null;
  const cityParam = filters.city ?? null;
  const yearParam = typeof filters.year === 'number' ? filters.year : null;
  const yearMinParam = typeof filters.yearMin === 'number' ? filters.yearMin : null;
  const yearMaxParam = typeof filters.yearMax === 'number' ? filters.yearMax : null;
  const minPriceParam = typeof filters.minPrice === 'number' ? filters.minPrice : null;
  const maxPriceParam = typeof filters.maxPrice === 'number' ? filters.maxPrice : null;
  const makeParam = filters.make ?? null;
  const modelParam = filters.model ?? null;
  const fuelParam = filters.fuel ?? null;
  const transmissionParam = filters.transmission ?? null;
  const ownerUserIdParam = filters.ownerUserId ?? null;
  const activeOnly = filters.activeOnly !== false;

  const rows = await prisma.$queryRaw<FtsRow[]>`
    SELECT 
      id,
      ts_rank("search_vector", to_tsquery('romanian', ${searchQuery})) AS rank
    FROM listings
    WHERE 
      (${activeOnly}::boolean = false OR status = 'active')
      AND (
        ${activeOnly}::boolean = false
        OR ${ownerUserIdParam}::text IS NOT NULL
        OR "expiresAt" IS NULL
        OR "expiresAt" > NOW()
      )
      AND "deletedAt" IS NULL
      AND "search_vector" @@ to_tsquery('romanian', ${searchQuery})
      AND (${ownerUserIdParam}::text IS NULL OR "ownerUserId" = ${ownerUserIdParam})
      AND (${categoryParam}::text IS NULL OR category = ${categoryParam})
      AND (${subcategoryParam}::text IS NULL OR subcategory = ${subcategoryParam})
      AND (${countyParam}::text IS NULL OR county = ${countyParam})
      AND (${cityParam}::text IS NULL OR city = ${cityParam})
      AND (${yearParam}::int IS NULL OR year = ${yearParam})
      AND (${yearMinParam}::int IS NULL OR year >= ${yearMinParam})
      AND (${yearMaxParam}::int IS NULL OR year <= ${yearMaxParam})
      AND (${minPriceParam}::int IS NULL OR "priceAmount" >= ${minPriceParam})
      AND (${maxPriceParam}::int IS NULL OR "priceAmount" <= ${maxPriceParam})
      AND (${makeParam}::text IS NULL OR make = ${makeParam})
      AND (${modelParam}::text IS NULL OR model = ${modelParam})
    AND (${fuelParam}::text IS NULL OR fuel::text = ${fuelParam})
    AND (${transmissionParam}::text IS NULL OR transmission::text = ${transmissionParam})
    ORDER BY rank DESC, "isPromoted" DESC, "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count
    FROM listings
    WHERE 
      (${activeOnly}::boolean = false OR status = 'active')
      AND (
        ${activeOnly}::boolean = false
        OR ${ownerUserIdParam}::text IS NOT NULL
        OR "expiresAt" IS NULL
        OR "expiresAt" > NOW()
      )
      AND "deletedAt" IS NULL
      AND "search_vector" @@ to_tsquery('romanian', ${searchQuery})
      AND (${ownerUserIdParam}::text IS NULL OR "ownerUserId" = ${ownerUserIdParam})
      AND (${categoryParam}::text IS NULL OR category = ${categoryParam})
      AND (${subcategoryParam}::text IS NULL OR subcategory = ${subcategoryParam})
      AND (${countyParam}::text IS NULL OR county = ${countyParam})
      AND (${cityParam}::text IS NULL OR city = ${cityParam})
      AND (${yearParam}::int IS NULL OR year = ${yearParam})
      AND (${yearMinParam}::int IS NULL OR year >= ${yearMinParam})
      AND (${yearMaxParam}::int IS NULL OR year <= ${yearMaxParam})
      AND (${minPriceParam}::int IS NULL OR "priceAmount" >= ${minPriceParam})
      AND (${maxPriceParam}::int IS NULL OR "priceAmount" <= ${maxPriceParam})
      AND (${makeParam}::text IS NULL OR make = ${makeParam})
      AND (${modelParam}::text IS NULL OR model = ${modelParam})
      AND (${fuelParam}::text IS NULL OR fuel::text = ${fuelParam})
      AND (${transmissionParam}::text IS NULL OR transmission::text = ${transmissionParam})
  `;

  const total = Number(countResult[0]?.count ?? 0);
  const ids = rows.map((r) => r.id);
  const ranks = rows.map((r) => Number(r.rank));
  return { ids, ranks, total };
}
