import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TAXONOMY } from "@/lib/taxonomy";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";

export type FooterIndexableLink = {
  slug: string;
  label: string;
  href: string;
};

export type FooterIndexableLinks = {
  categories: FooterIndexableLink[];
  cities: FooterIndexableLink[];
};

export const EMPTY_FOOTER_LINKS: FooterIndexableLinks = { categories: [], cities: [] };

/** Minimum sitewide listing count for a city to appear in the footer "Orașe" list. */
const FOOTER_MIN_CITY_LISTINGS = 1;

/** Max cities shown in the footer "Orașe" list. */
const FOOTER_TOP_CITIES_LIMIT = 10;

function shortCategoryLabel(categoryLabel: string): string {
  return categoryLabel.split(",")[0]?.trim() || categoryLabel;
}

/**
 * Full taxonomy — same source of truth used by the main navigation menu
 * (`lib/carData.ts` → `ALL_CATEGORIES`) and `sitemap-categories.xml`
 * (`lib/seo/sitemap-queries.ts`). Static, no DB query, always all categories
 * regardless of current inventory (pillar pages render safely at 0 listings).
 */
export function buildFooterCategoryLinks(): FooterIndexableLink[] {
  return TAXONOMY.map((cat) => ({
    slug: cat.slug,
    label: shortCategoryLabel(cat.label),
    href: `/${cat.slug}`,
  })).sort((a, b) => a.label.localeCompare(b.label, "ro"));
}

type PairCount = {
  category: string;
  city: string | null;
  _count: { _all: number };
};

/**
 * Pure builder — used by DB loader and unit tests (threshold / no PII).
 * Categories come from the static taxonomy (see `buildFooterCategoryLinks`).
 * Cities are the sitewide top-N by active listing count, aggregated in JS from
 * the same category×city groupBy so only a single DB aggregation is needed.
 */
export function buildFooterIndexableLinksFromPairs(byPair: PairCount[]): FooterIndexableLinks {
  const categories = buildFooterCategoryLinks();

  const cityTotals = new Map<string, number>();
  for (const row of byPair) {
    const city = row.city?.trim();
    if (!city) continue;
    cityTotals.set(city, (cityTotals.get(city) ?? 0) + row._count._all);
  }

  const cities: FooterIndexableLink[] = [...cityTotals.entries()]
    .filter(([, count]) => count >= FOOTER_MIN_CITY_LISTINGS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, FOOTER_TOP_CITIES_LIMIT)
    .map(([city]) => ({
      slug: city,
      label: city,
      href: `/listings?city=${encodeURIComponent(city)}`,
    }));

  return { categories, cities };
}

/**
 * One aggregated groupBy (category×city counts only — no listing rows / PII).
 * Errors are swallowed inside the cached fn so failures are not rethrown/cached as panics.
 */
async function loadFooterIndexableLinksSafe(): Promise<FooterIndexableLinks> {
  try {
    const indexableWhere = seoIndexableListingWhere();
    const byPair = await prisma.listing.groupBy({
      by: ["category", "city"],
      where: indexableWhere,
      _count: { _all: true },
    });
    return buildFooterIndexableLinksFromPairs(byPair);
  } catch (err) {
    console.error("[footer-indexable-links] failed; hiding hub blocks", {
      name: err instanceof Error ? err.name : "unknown",
    });
    return EMPTY_FOOTER_LINKS;
  }
}

const loadFooterIndexableLinksCached = unstable_cache(
  async (): Promise<FooterIndexableLinks> => loadFooterIndexableLinksSafe(),
  ["footer-indexable-links-v3"],
  {
    // Public aggregate counts only — safe to cache across requests.
    // Failures return EMPTY (not thrown), so error responses are not cached as throws.
    revalidate: 300,
    tags: ["footer-indexable-links"],
  },
);

/**
 * Footer links: full category taxonomy + sitewide top cities by active
 * listing count (≥1). Fail-soft: never throws — empty on DB/memory/error so
 * the page stays 200.
 */
export const getFooterIndexableLinks = cache(async (): Promise<FooterIndexableLinks> => {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return EMPTY_FOOTER_LINKS;
  }
  return loadFooterIndexableLinksCached();
});

/** Test seam: invoke the fail-soft loader without React/unstable_cache. */
export async function loadFooterIndexableLinksForTest(): Promise<FooterIndexableLinks> {
  return loadFooterIndexableLinksSafe();
}
