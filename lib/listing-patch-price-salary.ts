/**
 * PATCH effective price/salary state validation.
 */
import {
  isJobsCategory,
  validatePriceSalaryFields,
  type PriceTypeValue,
  type SalaryPeriodValue,
  PRICE_TYPES,
} from "@/lib/listing-price-salary-policy";

export type PriceSalarySnapshot = {
  category: string;
  subcategory?: string | null;
  priceType?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

function pick<T>(
  patch: Record<string, unknown>,
  key: string,
  existing: T
): T {
  if (Object.prototype.hasOwnProperty.call(patch, key)) {
    return patch[key] as T;
  }
  return existing;
}

export function validateEffectivePriceSalaryPatch(params: {
  existing: PriceSalarySnapshot;
  patch: Record<string, unknown>;
  effectiveCategory: string;
  effectiveSubcategory: string | null;
}): { ok: true; next: PriceSalarySnapshot } | { ok: false; message: string; path: string } {
  const { existing, patch, effectiveCategory, effectiveSubcategory } = params;
  const jobs = isJobsCategory(effectiveCategory);

  const next: PriceSalarySnapshot = {
    category: effectiveCategory,
    subcategory: effectiveSubcategory,
    priceType: pick(patch, "priceType", existing.priceType ?? null),
    priceAmount: pick(patch, "priceAmount", existing.priceAmount ?? null),
    priceCurrency: pick(patch, "priceCurrency", existing.priceCurrency ?? null),
    salaryMin: pick(patch, "salaryMin", existing.salaryMin ?? null),
    salaryMax: pick(patch, "salaryMax", existing.salaryMax ?? null),
    salaryCurrency: pick(patch, "salaryCurrency", existing.salaryCurrency ?? null),
    salaryPeriod: pick(patch, "salaryPeriod", existing.salaryPeriod ?? null),
  };

  const salaryTouched = ["salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"].some(
    (k) => Object.prototype.hasOwnProperty.call(patch, k)
  );
  if (!jobs && salaryTouched) {
    const hasSalaryValue =
      next.salaryMin != null ||
      next.salaryMax != null ||
      next.salaryCurrency != null ||
      next.salaryPeriod != null;
    if (hasSalaryValue) {
      return {
        ok: false,
        message: "Câmpurile salariale sunt permise numai pentru Locuri de muncă",
        path: "salaryMin",
      };
    }
  }

  // Category switched to Jobs → clear commercial price
  if (jobs) {
    next.priceType = null;
    if (!Object.prototype.hasOwnProperty.call(patch, "priceAmount")) {
      next.priceAmount = null;
    }
    next.priceCurrency = null;
  } else {
    next.salaryMin = null;
    next.salaryMax = null;
    next.salaryCurrency = null;
    next.salaryPeriod = null;
    if (
      next.priceType &&
      !PRICE_TYPES.includes(next.priceType as PriceTypeValue)
    ) {
      return { ok: false, message: "Tip de preț invalid", path: "priceType" };
    }
  }

  const issues = validatePriceSalaryFields(
    {
      category: effectiveCategory,
      subcategory: effectiveSubcategory,
      priceType: (next.priceType as PriceTypeValue | null) ?? null,
      priceAmount: next.priceAmount ?? null,
      priceCurrency: next.priceCurrency ?? null,
      salaryMin: next.salaryMin ?? null,
      salaryMax: next.salaryMax ?? null,
      salaryCurrency: next.salaryCurrency ?? null,
      salaryPeriod: (next.salaryPeriod as SalaryPeriodValue | null) ?? null,
    },
    { mode: "update", allowLegacyJobPriceAmount: false }
  );

  // Updates that don't touch price fields on legacy non-Job FIXED rows:
  // if no price keys in patch and existing is valid FIXED with amount, OK.
  const touchesPrice =
    ["priceType", "priceAmount", "priceCurrency", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"].some(
      (k) => Object.prototype.hasOwnProperty.call(patch, k)
    ) ||
    Object.prototype.hasOwnProperty.call(patch, "category");

  if (!touchesPrice) {
    return { ok: true, next: existing };
  }

  if (issues.length > 0) {
    return { ok: false, message: issues[0].message, path: issues[0].path };
  }

  return { ok: true, next };
}
