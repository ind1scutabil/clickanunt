/**
 * Pure builders for prisma/seed-listings.ts.
 * Keeps seed data consistent with expand migration backfill rules:
 * non-Job with priceAmount > 0 → priceType FIXED; never invent FREE/ON_REQUEST;
 * never invent salaryPeriod from a legacy amount.
 */

import type { Condition, FuelType, Transmission, PriceType, SalaryPeriod } from "@prisma/client";

export type SeedListingSample = {
  category: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency?: string;
  priceType?: PriceType;
  county: string;
  city: string;
  condition?: Condition;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel?: FuelType;
  transmission?: Transmission;
  isFeatured?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;
};

const JOBS = "Locuri de muncă";

export function buildSeedListingCreateData(
  listing: SeedListingSample
): SeedListingSample & { priceType?: SeedListingSample["priceType"] } {
  const out: SeedListingSample = { ...listing };

  if (out.priceAmount != null && out.priceAmount <= 0) {
    throw new Error(
      `seed-listings: refuz priceAmount=${out.priceAmount} pentru "${out.title}" (nu crea 0)`
    );
  }

  if (out.category === JOBS) {
    // Jobs may keep legacy amount without priceType, or use structured salary only.
    if (out.priceType != null) {
      throw new Error(
        `seed-listings: Job "${out.title}" nu trebuie să aibă priceType comercial`
      );
    }
    return out;
  }

  if (out.priceAmount > 0 && out.priceType == null) {
    out.priceType = "FIXED";
  }
  if (!out.priceCurrency) {
    out.priceCurrency = "RON";
  }
  return out;
}
