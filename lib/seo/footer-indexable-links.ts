import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MIN_INDEXABLE_HUB_LISTINGS } from "@/lib/seo/hub-index-policy";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import {
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
  primarySlugForCategoryLabel,
} from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";

export type FooterIndexableLink = {
  slug: string;
  label: string;
  href: string;
};

export type FooterIndexableLinks = {
  categories: FooterIndexableLink[];
  cityHubs: FooterIndexableLink[];
};

export const EMPTY_FOOTER_LINKS: FooterIndexableLinks = { categories: [], cityHubs: [] };

function shortCategoryLabel(categoryLabel: string, slug: string): string {
  const fromMap = CATEGORY_LABEL_BY_CANONICAL_SLUG[slug];
  const source = fromMap ?? categoryLabel;
  return source.split(",")[0]?.trim() || slug;
}

type PairCount = {
  category: string;
  city: string | null;
  _count: { _all: number };
};

/** Pure builder — used by DB loader and unit tests (threshold / no PII). */
export function buildFooterIndexableLinksFromPairs(byPair: PairCount[]): FooterIndexableLinks {
  const categoryTotals = new Map<string, number>();
  for (const row of byPair) {
    categoryTotals.set(
      row.category,
      (categoryTotals.get(row.category) ?? 0) + row._count._all,
    );
  }

  const categories: FooterIndexableLink[] = [...categoryTotals.entries()]
    .filter(([, count]) => count >= MIN_INDEXABLE_HUB_LISTINGS)
    .map(([category, count]) => {
      const slug = primarySlugForCategoryLabel(category);
      if (!slug) return null;
      return {
        slug,
        label: shortCategoryLabel(category, slug),
        href: `/${slug}`,
        count,
      };
    })
    .filter((x): x is FooterIndexableLink & { count: number } => x != null)
    .sort((a, b) => b.count - a.count)
    .map(({ slug, label, href }) => ({ slug, label, href }));

  const cityHubs: FooterIndexableLink[] = byPair
    .filter(
      (row) =>
        row.city &&
        String(row.city).trim().length > 0 &&
        row._count._all >= MIN_INDEXABLE_HUB_LISTINGS,
    )
    .map((row) => {
      const catSlug = primarySlugForCategoryLabel(row.category);
      if (!catSlug || !row.city) return null;
      const citySlug = slugifyRo(row.city);
      const catShort = shortCategoryLabel(row.category, catSlug);
      return {
        slug: `${catSlug}/${citySlug}`,
        label: `${catShort} · ${row.city}`,
        href: `/${catSlug}/${citySlug}`,
        count: row._count._all,
      };
    })
    .filter((x): x is FooterIndexableLink & { count: number } => x != null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map(({ slug, label, href }) => ({ slug, label, href }));

  return { categories, cityHubs };
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
  ["footer-indexable-links-v2"],
  {
    // Public aggregate counts only — safe to cache across requests.
    // Failures return EMPTY (not thrown), so error responses are not cached as throws.
    revalidate: 300,
    tags: ["footer-indexable-links"],
  },
);

/**
 * Footer SEO hub links with enough indexable inventory (≥ MIN_INDEXABLE_HUB_LISTINGS).
 * Fail-soft: never throws — empty hubs on DB/memory/error so the page stays 200.
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
