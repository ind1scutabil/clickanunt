/**
 * Build Offer / JobPosting salary fragments for listing JSON-LD.
 * Offer.price only when a real commercial amount exists.
 * JobPosting.baseSalary only with structured salary (period + amounts).
 */
import {
  isJobsCategory,
  priceTypeForbidsAmount,
  type PriceTypeValue,
  type SalaryPeriodValue,
  SALARY_PERIOD_LABEL_RO,
} from "@/lib/listing-price-salary-policy";

const UNIT_TEXT: Record<SalaryPeriodValue, string> = {
  HOUR: "HOUR",
  DAY: "DAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
  YEAR: "YEAR",
};

export type ListingOfferJsonLdInput = {
  category: string;
  priceType?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

/** Returns Offer price fields or null when price must be omitted. */
export function buildCommercialOfferPriceFields(
  input: ListingOfferJsonLdInput
): { price: number; priceCurrency: string } | null {
  if (isJobsCategory(input.category)) return null;
  const type = (input.priceType || "FIXED") as PriceTypeValue;
  const currency = (input.priceCurrency?.trim() || "RON").toUpperCase();

  // FREE: UI says „Gratuit”. Offer.price is omitted — do not publish 0.
  // Verified docs (2026-07):
  // - schema.org Offer.price: commercial price of the offer
  // - Google merchant listings structured data: price required and must be > 0
  //   (developers.google.com/search/docs/appearance/structured-data/merchant-listing)
  // Nu pot confirma că Offer.price=0 este eligibil pentru Product rich results
  // în cazul marketplace FREE; implementarea omite oferta comercială pentru a
  // evita publicarea unei valori ambigue.
  if (type === "FREE" || type === "ON_REQUEST" || priceTypeForbidsAmount(type)) {
    return null;
  }
  const amount = input.priceAmount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return { price: amount, priceCurrency: currency };
}

export function buildJobBaseSalaryJsonLd(
  input: ListingOfferJsonLdInput
): Record<string, unknown> | null {
  if (!isJobsCategory(input.category)) return null;
  const min = input.salaryMin;
  const max = input.salaryMax;
  const period = input.salaryPeriod as SalaryPeriodValue | null | undefined;
  const currency = (input.salaryCurrency?.trim() || "").toUpperCase();
  if ((min == null && max == null) || !period || !currency) return null;
  if (!UNIT_TEXT[period]) return null;

  const value: Record<string, unknown> = {
    "@type": "QuantitativeValue",
    unitText: UNIT_TEXT[period],
  };
  if (min != null && max != null && min === max) {
    value.value = min;
  } else {
    if (min != null) value.minValue = min;
    if (max != null) value.maxValue = max;
  }

  return {
    "@type": "MonetaryAmount",
    currency,
    value,
  };
}

/** Human period label (tests / display). */
export function salaryPeriodUnitLabel(period: SalaryPeriodValue): string {
  return SALARY_PERIOD_LABEL_RO[period];
}

/** `contract_type` attribute (Locuri de muncă taxonomy) → schema.org JobPosting.employmentType enum. */
const CONTRACT_TYPE_TO_EMPLOYMENT_TYPE: Record<string, string> = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Freelance: "CONTRACTOR",
  Internship: "INTERN",
  Temporar: "TEMPORARY",
};

/** Returns JobPosting.employmentType only for a real, known `contract_type` value — never inferred/invented. */
export function buildJobEmploymentType(contractType: unknown): string | null {
  if (typeof contractType !== "string") return null;
  return CONTRACT_TYPE_TO_EMPLOYMENT_TYPE[contractType.trim()] ?? null;
}
