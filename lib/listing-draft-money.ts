/**
 * Normalize draft listing money fields for Prisma create/update.
 * Never coerce null/undefined → 0.
 */
import {
  isJobsCategory,
  normalizeLegacyPricePayload,
  priceTypeForbidsAmount,
  type PriceTypeValue,
  type SalaryPeriodValue,
} from "@/lib/listing-price-salary-policy";

export type DraftMoneyInput = {
  category?: string | null;
  subcategory?: string | null;
  priceType?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

export type DraftMoneyPersist = {
  priceType: PriceTypeValue | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriodValue | null;
};

/**
 * Map draft payload → nullable Prisma money columns.
 * Absent category → store raw nullable amount without inventing FIXED.
 */
export function normalizeDraftMoneyFields(input: DraftMoneyInput): DraftMoneyPersist {
  const category = (input.category || "").trim();
  if (!category) {
    return {
      priceType: null,
      priceAmount:
        typeof input.priceAmount === "number" && Number.isFinite(input.priceAmount)
          ? input.priceAmount
          : null,
      priceCurrency: input.priceCurrency ?? null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
    };
  }

  const jobs = isJobsCategory(category);
  const normalized = normalizeLegacyPricePayload({
    category,
    subcategory: input.subcategory ?? null,
    priceType: input.priceType ?? null,
    priceAmount: input.priceAmount ?? null,
    priceCurrency: input.priceCurrency ?? null,
  });

  if (jobs) {
    const hasStructured =
      input.salaryMin != null ||
      input.salaryMax != null ||
      input.salaryCurrency != null ||
      input.salaryPeriod != null;
    return {
      priceType: null,
      priceAmount: hasStructured
        ? null
        : normalized.legacyJobPriceAmount
          ? normalized.priceAmount
          : null,
      priceCurrency: null,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      salaryCurrency: input.salaryCurrency ?? null,
      salaryPeriod: (input.salaryPeriod as SalaryPeriodValue | null) ?? null,
    };
  }

  const type = normalized.priceType;
  if (type && priceTypeForbidsAmount(type)) {
    return {
      priceType: type,
      priceAmount: null,
      priceCurrency: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
    };
  }

  return {
    priceType: type,
    priceAmount: normalized.priceAmount,
    priceCurrency: normalized.priceCurrency,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
  };
}
