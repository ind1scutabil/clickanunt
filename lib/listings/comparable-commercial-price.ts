/**
 * Shared “commercial price comparable” policy for feed sort, catalog filters, and related bands.
 * No FX conversion — amounts are only comparable within the same priceCurrency.
 */
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { isJobsCategory } from "@/lib/listing-price-salary-policy";

export const COMPARABLE_COMMERCIAL_PRICE_TYPES = [
  "FIXED",
  "NEGOTIABLE",
  "FROM",
] as const;

export type ComparableCommercialPriceType =
  (typeof COMPARABLE_COMMERCIAL_PRICE_TYPES)[number];

/** ±25% proximity band (existing related-listings policy). */
export const RELATED_PRICE_BAND_RATIO = 0.25;

/**
 * Legacy null priceType is treated as FIXED-like commercial amount.
 * FREE / ON_REQUEST are never comparable by amount.
 */
export function isComparableCommercialPriceType(
  priceType: string | null | undefined
): boolean {
  if (priceType == null || priceType === "") return true;
  return (COMPARABLE_COMMERCIAL_PRICE_TYPES as readonly string[]).includes(
    priceType
  );
}

/** Static SQL: commercial comparable priceType (legacy null OK). */
export function sqlComparableCommercialPriceType(): Prisma.Sql {
  return Prisma.sql`("priceType" IS NULL OR "priceType"::text IN ('FIXED','NEGOTIABLE','FROM'))`;
}

export type RelatedPriceBand =
  | {
      mode: "band";
      currency: string;
      amount: number;
      bandLow: number;
      bandHigh: number;
    }
  | { mode: "taxonomy" };

/**
 * Whether a source listing may drive a numeric ±25% related price band.
 * Jobs, FREE, ON_REQUEST, missing amount/currency → taxonomy-only fallback.
 */
export function resolveRelatedPriceBand(source: {
  category: string;
  priceAmount: number | null | undefined;
  priceCurrency: string | null | undefined;
  priceType: string | null | undefined;
}): RelatedPriceBand {
  if (isJobsCategory(source.category)) {
    return { mode: "taxonomy" };
  }
  const type = source.priceType ?? null;
  if (type === "FREE" || type === "ON_REQUEST") {
    return { mode: "taxonomy" };
  }
  if (!isComparableCommercialPriceType(type)) {
    return { mode: "taxonomy" };
  }
  const amount = source.priceAmount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return { mode: "taxonomy" };
  }
  const currency = source.priceCurrency?.trim();
  if (!currency) {
    return { mode: "taxonomy" };
  }
  const ratio = RELATED_PRICE_BAND_RATIO;
  return {
    mode: "band",
    currency,
    amount,
    bandLow: Math.max(0, Math.floor(amount * (1 - ratio))),
    bandHigh: Math.ceil(amount * (1 + ratio)),
  };
}

/** Prisma fragment for candidates inside a currency-safe price band. */
export function relatedPriceBandWhere(
  band: Extract<RelatedPriceBand, { mode: "band" }>
): PrismaTypes.ListingWhereInput {
  return {
    priceCurrency: band.currency,
    priceAmount: { gte: band.bandLow, lte: band.bandHigh },
    OR: [
      { priceType: null },
      { priceType: { in: [...COMPARABLE_COMMERCIAL_PRICE_TYPES] } },
    ],
  };
}
