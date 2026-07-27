/**
 * Server-side guards for public browse/search filter params.
 * Keeps currency-aware price bands and Auto vehicle filters coherent.
 */
import { isAutoCategoryLabel } from "@/lib/listing-attributes-sanitize";

export const BROWSE_PRICE_CURRENCIES = ["RON", "EUR", "USD"] as const;
export type BrowsePriceCurrency = (typeof BROWSE_PRICE_CURRENCIES)[number];

export type PriceBandGuardInput = {
  minPrice: number | null;
  maxPrice: number | null;
  priceCurrency: string | null | undefined;
};

export type PriceBandGuardResult =
  | { ok: true; minPrice: number | null; maxPrice: number | null; priceCurrency: BrowsePriceCurrency | null }
  | { ok: false; error: string };

export function parseOptionalNonNegNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * When either price bound is set, currency is required (no cross-currency compare).
 * min > max → 400.
 */
export function guardBrowsePriceBand(input: PriceBandGuardInput): PriceBandGuardResult {
  const minPrice = input.minPrice;
  const maxPrice = input.maxPrice;
  const hasBand = minPrice != null || maxPrice != null;
  if (!hasBand) {
    return { ok: true, minPrice: null, maxPrice: null, priceCurrency: null };
  }

  const rawCurrency =
    typeof input.priceCurrency === "string" ? input.priceCurrency.trim().toUpperCase() : "";
  if (!rawCurrency) {
    return {
      ok: false,
      error: "priceCurrency este obligatoriu când folosești filtre de preț (RON, EUR sau USD).",
    };
  }
  if (!(BROWSE_PRICE_CURRENCIES as readonly string[]).includes(rawCurrency)) {
    return { ok: false, error: "priceCurrency invalid. Folosește RON, EUR sau USD." };
  }

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return { ok: false, error: "Prețul minim nu poate fi mai mare decât prețul maxim." };
  }

  return {
    ok: true,
    minPrice,
    maxPrice,
    priceCurrency: rawCurrency as BrowsePriceCurrency,
  };
}

export type VehicleFilterGuardInput = {
  category: string | null | undefined;
  make?: string | null;
  model?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  year?: number | null;
  yearMin?: number | null;
  yearMax?: number | null;
};

/**
 * Auto vehicle params are rejected when category is set and is not Auto.
 * When category is absent, params remain allowed (hub/legacy URLs).
 */
export function guardVehicleFiltersForCategory(input: VehicleFilterGuardInput): {
  ok: true;
  apply: boolean;
} | { ok: false; error: string } {
  const hasVehicle =
    Boolean(input.make) ||
    Boolean(input.model) ||
    Boolean(input.fuel) ||
    Boolean(input.transmission) ||
    input.year != null ||
    input.yearMin != null ||
    input.yearMax != null;

  if (!hasVehicle) {
    return { ok: true, apply: false };
  }

  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!category) {
    return { ok: true, apply: true };
  }
  if (!isAutoCategoryLabel(category)) {
    return {
      ok: false,
      error: "Filtrele Auto (marcă/model/an/combustibil/transmisie) pot fi folosite doar în categoria Auto.",
    };
  }
  return { ok: true, apply: true };
}

/** Build JSON object for `attributes @> $jsonb` equality filters (stable key order). */
export function buildAttributesContainmentObject(
  attrs: Array<{ key: string; value: string | number }>
): Record<string, string | number> | null {
  if (!attrs.length) return null;
  const out: Record<string, string | number> = {};
  for (const a of attrs) {
    const key = a.key.trim();
    if (!key || key.length > 64) continue;
    out[key] = a.value;
  }
  return Object.keys(out).length ? out : null;
}
