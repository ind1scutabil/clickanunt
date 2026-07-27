/**
 * listing-price-semantics — compatibility layer for FAZA 5 call sites.
 * Prefer formatListingCommercialOrSalaryLine / listing-price-salary-policy.
 */
export {
  formatCategoryAwarePriceLine,
} from "@/lib/format-listing-price";

import { getMarketplacePriceFieldCopy } from "@/lib/listing-price-salary-policy";
import { isJobsCategory } from "@/lib/listing-price-salary-policy";

/** @deprecated Prefer getMarketplacePriceFieldCopy */
export function getPriceFieldSemantics(categoryLabel: string | null | undefined): {
  label: string;
  hint: string;
  meaning?: "jobs_compat_placeholder" | "commercial" | "salary";
} {
  const copy = getMarketplacePriceFieldCopy(categoryLabel);
  if (categoryLabel && isJobsCategory(categoryLabel)) {
    return {
      label: copy.label,
      hint: copy.hint,
      meaning: "salary",
    };
  }
  return {
    label: copy.label,
    hint: copy.hint,
    meaning: "commercial",
  };
}
