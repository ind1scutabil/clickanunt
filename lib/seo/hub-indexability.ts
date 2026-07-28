/**
 * Hub SEO indexability policy — configurable thresholds, no invented inventory.
 */
import {
  AUTO_HUB_INDEX_THRESHOLDS,
  type AutoHubLevel,
} from "@/lib/seo/sitemap-constants";
import {
  MIN_INDEXABLE_HUB_LISTINGS,
  isCategoryCityHubSeoIndexable,
  categoryCityHubShouldNoindex,
} from "@/lib/seo/hub-index-policy";

export {
  MIN_INDEXABLE_HUB_LISTINGS,
  isCategoryCityHubSeoIndexable,
  categoryCityHubShouldNoindex,
  AUTO_HUB_INDEX_THRESHOLDS,
};
export type { AutoHubLevel };

export type HubKind =
  | "category"
  | "subcategory"
  | "category_county"
  | "category_city"
  | "auto_make"
  | "auto_model"
  | "auto_model_city";

export type HubIndexDecision = {
  kind: HubKind;
  listingCount: number;
  threshold: number;
  indexable: boolean;
  includeInSitemap: boolean;
  robots: "index, follow" | "noindex, follow";
  reason: string;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function hubThresholdFor(kind: HubKind): number {
  switch (kind) {
    case "category":
      return envInt("SEO_HUB_MIN_CATEGORY", 1);
    case "subcategory":
      return envInt("SEO_HUB_MIN_SUBCATEGORY", 3);
    case "category_county":
      return envInt("SEO_HUB_MIN_CATEGORY_COUNTY", MIN_INDEXABLE_HUB_LISTINGS);
    case "category_city":
      return envInt("SEO_HUB_MIN_CATEGORY_CITY", MIN_INDEXABLE_HUB_LISTINGS);
    case "auto_make":
      return envInt("SEO_HUB_MIN_AUTO_MAKE", AUTO_HUB_INDEX_THRESHOLDS.make);
    case "auto_model":
      return envInt("SEO_HUB_MIN_AUTO_MODEL", AUTO_HUB_INDEX_THRESHOLDS.model);
    case "auto_model_city":
      return envInt("SEO_HUB_MIN_AUTO_MODEL_CITY", AUTO_HUB_INDEX_THRESHOLDS.modelCity);
    default:
      return MIN_INDEXABLE_HUB_LISTINGS;
  }
}

export function decideHubIndexability(kind: HubKind, listingCount: number): HubIndexDecision {
  const threshold = hubThresholdFor(kind);
  const indexable = listingCount >= threshold;
  return {
    kind,
    listingCount,
    threshold,
    indexable,
    includeInSitemap: indexable,
    robots: indexable ? "index, follow" : "noindex, follow",
    reason: indexable
      ? `listingCount ${listingCount} >= threshold ${threshold}`
      : `listingCount ${listingCount} < threshold ${threshold} — thin hub`,
  };
}
