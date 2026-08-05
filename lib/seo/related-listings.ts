/**
 * Related / similar crawl links: same category (+ preferred city), optional ±25% price band
 * only when the source has a currency-safe comparable commercial amount.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hubWhereBase } from "@/lib/seo/hub-queries";
import {
  relatedPriceBandWhere,
  resolveRelatedPriceBand,
  type RelatedPriceBand,
} from "@/lib/listings/comparable-commercial-price";

export type RelatedListingSource = {
  id: string;
  category: string;
  city: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceType: string | null;
};

export type RelatedListingRow = { id: string; title: string };

const RELATED_TAKE = 10;
const RELATED_MIN_CITY = 4;

function hubAndClauses(): Prisma.ListingWhereInput[] {
  const and = hubWhereBase.AND;
  if (!and) return [];
  return Array.isArray(and) ? [...and] : [and];
}

function buildRelatedWhere(
  source: RelatedListingSource,
  band: RelatedPriceBand,
  opts: { includeCity: boolean; applyBand: boolean }
): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [...hubAndClauses()];
  if (opts.applyBand && band.mode === "band") {
    and.push(relatedPriceBandWhere(band));
  }
  const { AND: _drop, ...hubRest } = hubWhereBase;
  return {
    ...hubRest,
    category: source.category,
    id: { not: source.id },
    ...(opts.includeCity && source.city ? { city: source.city } : {}),
    AND: and,
  };
}

/**
 * Fetch related public listings. Price band only with matching priceCurrency;
 * otherwise taxonomy/recency fallback (same category, optional city).
 */
export async function fetchRelatedListings(
  source: RelatedListingSource,
  take: number = RELATED_TAKE
): Promise<{ rows: RelatedListingRow[]; usedPriceBand: boolean }> {
  const band = resolveRelatedPriceBand(source);
  const useBand = band.mode === "band";
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = [
    { updatedAt: "desc" },
    { id: "desc" },
  ];
  const select = { id: true, title: true } as const;

  let rows = await prisma.listing.findMany({
    where: buildRelatedWhere(source, band, {
      includeCity: Boolean(source.city),
      applyBand: useBand,
    }),
    orderBy,
    take,
    select,
  });

  if (rows.length < RELATED_MIN_CITY && source.city) {
    rows = await prisma.listing.findMany({
      where: buildRelatedWhere(source, band, {
        includeCity: false,
        applyBand: useBand,
      }),
      orderBy,
      take,
      select,
    });
  }

  if (rows.length < RELATED_MIN_CITY && useBand) {
    // Taxonomy fallback without inventing a cross-currency band.
    rows = await prisma.listing.findMany({
      where: buildRelatedWhere(source, band, {
        includeCity: Boolean(source.city),
        applyBand: false,
      }),
      orderBy,
      take,
      select,
    });
    if (rows.length < RELATED_MIN_CITY && source.city) {
      rows = await prisma.listing.findMany({
        where: buildRelatedWhere(source, band, {
          includeCity: false,
          applyBand: false,
        }),
        orderBy,
        take,
        select,
      });
    }
    return { rows, usedPriceBand: false };
  }

  return { rows, usedPriceBand: useBand && rows.length > 0 };
}

/** Exported for unit tests — builds the band-applied where without DB. */
export function relatedListingsWhereForTest(
  source: RelatedListingSource,
  opts: { includeCity: boolean; applyBand: boolean }
): Prisma.ListingWhereInput {
  return buildRelatedWhere(source, resolveRelatedPriceBand(source), opts);
}
