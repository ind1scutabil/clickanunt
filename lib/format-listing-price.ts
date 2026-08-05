/**
 * Single listing price / salary display formatter.
 */
import {
  isJobsCategory,
  type PriceTypeValue,
  type SalaryPeriodValue,
  SALARY_PERIOD_LABEL_RO,
} from "@/lib/listing-price-salary-policy";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatListingPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount == null || !Number.isFinite(amount) || amount === 0) return "Negociabil";
  const code = (currency || "RON").trim().toUpperCase() || "RON";
  return `${formatAmount(amount)} ${code}`;
}

export type ListingPriceDisplayInput = {
  category?: string | null;
  priceType?: PriceTypeValue | string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriodValue | string | null;
  /** Legacy free-text from attributes.salary_range (pre-migration Jobs). */
  legacySalaryRange?: string | null;
};

/**
 * Canonical card/detail/dashboard/SEO price line (single string).
 * Listing `priceAmount` is major currency units (not cents/bani).
 */
export function formatListingPublicPriceLine(input: ListingPriceDisplayInput): string {
  const line = formatListingCommercialOrSalaryLine(input);
  return line.suffix ? `${line.primary} · ${line.suffix}` : line.primary;
}

/**
 * Canonical card/detail/dashboard price line.
 */
export function formatListingCommercialOrSalaryLine(
  input: ListingPriceDisplayInput
): { primary: string; suffix?: string } {
  if (input.category && isJobsCategory(input.category)) {
    const rangeText =
      typeof input.legacySalaryRange === "string"
        ? input.legacySalaryRange.trim()
        : "";
    const min = input.salaryMin;
    const max = input.salaryMax;
    const cur = (input.salaryCurrency || "RON").trim().toUpperCase() || "RON";
    const period = input.salaryPeriod
      ? SALARY_PERIOD_LABEL_RO[input.salaryPeriod as SalaryPeriodValue] ||
        String(input.salaryPeriod).toLowerCase()
      : null;

    if (min != null || max != null) {
      const a = min != null ? formatAmount(min) : null;
      const b = max != null ? formatAmount(max) : null;
      let primary: string;
      if (a != null && b != null && min === max) primary = `${a} ${cur}`;
      else if (a != null && b != null) primary = `${a}–${b} ${cur}`;
      else if (a != null) primary = `De la ${a} ${cur}`;
      else primary = `Până la ${b} ${cur}`;
      return { primary, suffix: period ? `/${period}` : undefined };
    }
    if (rangeText) {
      return { primary: rangeText, suffix: "detalii text" };
    }
    return { primary: "Salariu nespecificat" };
  }

  const type = (input.priceType || "FIXED") as PriceTypeValue;
  const amount = input.priceAmount;
  const code = (input.priceCurrency || "RON").trim().toUpperCase() || "RON";

  switch (type) {
    case "FREE":
      return { primary: "Gratuit" };
    case "ON_REQUEST":
      return { primary: "Preț la cerere" };
    case "FROM":
      if (amount != null && amount > 0) {
        return { primary: `De la ${formatAmount(amount)} ${code}` };
      }
      return { primary: "Preț la cerere" };
    case "NEGOTIABLE":
      if (amount != null && amount > 0) {
        return { primary: `${formatAmount(amount)} ${code}`, suffix: "Negociabil" };
      }
      return { primary: "Negociabil" };
    case "FIXED":
    default:
      if (amount != null && amount > 0) {
        return { primary: `${formatAmount(amount)} ${code}` };
      }
      return { primary: "Negociabil" };
  }
}

/** @deprecated Prefer formatListingCommercialOrSalaryLine */
export function formatCategoryAwarePriceLine(params: {
  categoryLabel: string | null | undefined;
  priceAmount: number | null | undefined;
  priceCurrency?: string | null;
  attributes?: Record<string, unknown> | null;
  priceType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}): { primary: string; suffix?: string } {
  const legacy =
    typeof params.attributes?.salary_range === "string"
      ? params.attributes.salary_range
      : null;
  return formatListingCommercialOrSalaryLine({
    category: params.categoryLabel,
    priceType: params.priceType,
    priceAmount: params.priceAmount,
    priceCurrency: params.priceCurrency,
    salaryMin: params.salaryMin,
    salaryMax: params.salaryMax,
    salaryCurrency: params.salaryCurrency,
    salaryPeriod: params.salaryPeriod,
    legacySalaryRange: legacy,
  });
}
