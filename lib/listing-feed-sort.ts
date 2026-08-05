import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { sqlComparableCommercialPriceType } from '@/lib/listings/comparable-commercial-price';

/**
 * Matches `searchListingsSchema.sort` in `lib/security/validation-schemas.ts`.
 * `relevance` is only meaningful with FTS (`q`); without `q` it falls back to newest.
 */
export type ListingFeedSort =
  | 'newest'
  | 'featured'
  | 'priceAsc'
  | 'priceDesc'
  | 'relevance';

const KNOWN_SORTS = new Set<string>([
  'newest',
  'featured',
  'priceAsc',
  'priceDesc',
  'relevance',
]);

export function parseListingFeedSort(
  raw: string | undefined | null,
  opts?: { hasTextQuery?: boolean }
): ListingFeedSort {
  const hasQ = Boolean(opts?.hasTextQuery);
  if (raw == null || raw === '') {
    return hasQ ? 'relevance' : 'newest';
  }
  if (!KNOWN_SORTS.has(raw)) {
    // Invalid sort — documented fallback (same spirit as pre-12B newest default).
    return hasQ ? 'relevance' : 'newest';
  }
  if (raw === 'relevance' && !hasQ) {
    return 'newest';
  }
  return raw as ListingFeedSort;
}

export function prismaOrderByForListingSort(
  sort: ListingFeedSort
): PrismaTypes.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case 'featured':
      return [{ feedBoost: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
    case 'newest':
    case 'relevance':
      // relevance without FTS degenerates to newest (no rank column in Prisma path).
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    case 'priceAsc':
      // Prefer browseListingIdsOrdered / FTS ftsOrderBySql for currency-aware CASE.
      // Prisma raw amount order must not be used for public multi-currency catalogs.
      return [
        { priceAmount: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ];
    case 'priceDesc':
      return [
        { priceAmount: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ];
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

/** Keyset cursor in `lib/pagination.ts` is only valid for featured (feedBoost) ordering. */
export function feedBoostKeysetPaginationEnabled(sort: ListingFeedSort): boolean {
  return sort === 'featured';
}

export function isPriceFeedSort(sort: ListingFeedSort): boolean {
  return sort === 'priceAsc' || sort === 'priceDesc';
}

/**
 * Live promotion expression for FTS ORDER BY — expired promotions do not boost.
 * Static SQL only (no user input). Built per-call to avoid Prisma.sql at module load in Jest.
 */
function livePromoScoreSql(): Prisma.Sql {
  return Prisma.sql`(
  CASE
    WHEN "isPromoted" = true
      AND ("promotionExpiresAt" IS NULL OR "promotionExpiresAt" > NOW())
    THEN GREATEST(COALESCE("feedBoost", 0), 1)
    ELSE 0
  END
)`;
}

/**
 * Comparable commercial amount: FIXED/NEGOTIABLE/FROM/legacy-null type with amount + matching currency.
 * Non-comparable (FREE/ON_REQUEST/wrong currency/Jobs null) sort last via bucket 1.
 */
function comparablePriceBucketAsc(priceCurrency: string): Prisma.Sql {
  return Prisma.sql`(
    CASE
      WHEN "priceAmount" IS NOT NULL
        AND "priceCurrency" = ${priceCurrency}
        AND ${sqlComparableCommercialPriceType()}
      THEN 0
      ELSE 1
    END
  )`;
}

function comparablePriceValue(priceCurrency: string): Prisma.Sql {
  return Prisma.sql`(
    CASE
      WHEN "priceAmount" IS NOT NULL
        AND "priceCurrency" = ${priceCurrency}
        AND ${sqlComparableCommercialPriceType()}
      THEN "priceAmount"
      ELSE NULL
    END
  )`;
}

/**
 * Allowlisted ORDER BY for FTS raw SQL. Never interpolate user `sort` into SQL.
 * `rankExpr` must be the same ts_rank expression used in SELECT.
 */
export function ftsOrderBySql(
  sort: ListingFeedSort,
  rankExpr: Prisma.Sql,
  priceCurrency: string | null
): Prisma.Sql {
  const livePromo = livePromoScoreSql();
  switch (sort) {
    case 'relevance':
      return Prisma.sql`ORDER BY ${rankExpr} DESC, ${livePromo} DESC, "createdAt" DESC, id DESC`;
    case 'newest':
      return Prisma.sql`ORDER BY "createdAt" DESC, id DESC`;
    case 'featured':
      return Prisma.sql`ORDER BY ${livePromo} DESC, "createdAt" DESC, id DESC`;
    case 'priceAsc': {
      const currency = priceCurrency ?? 'RON';
      return Prisma.sql`ORDER BY ${comparablePriceBucketAsc(currency)} ASC, ${comparablePriceValue(currency)} ASC NULLS LAST, "createdAt" DESC, id DESC`;
    }
    case 'priceDesc': {
      const currency = priceCurrency ?? 'RON';
      return Prisma.sql`ORDER BY ${comparablePriceBucketAsc(currency)} ASC, ${comparablePriceValue(currency)} DESC NULLS LAST, "createdAt" DESC, id DESC`;
    }
    default:
      return Prisma.sql`ORDER BY "createdAt" DESC, id DESC`;
  }
}
