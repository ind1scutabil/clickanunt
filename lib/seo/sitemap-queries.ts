import { prisma } from '@/lib/prisma';
import { slugifyRo } from '@/lib/seo/slug';
import type { SitemapEntry } from '@/lib/seo';
import { seoIndexableListingWhere } from '@/lib/seo/indexable-listing-where';
import { primarySlugForCategoryLabel } from '@/lib/seo/market-paths';
import { siteOriginForSeoFeeds } from '@/lib/seo/site-url-guard';
import { MIN_INDEXABLE_HUB_LISTINGS } from '@/lib/seo/hub-index-policy';
import { shouldEmitCategorySubcategorySitemapPath } from '@/lib/seo/category-sitemap-policy';
import { iterateAllSubcategorySlugs } from '@/lib/taxonomy';

const AUTO_LABEL = 'Auto, moto și ambarcațiuni';

/** Pillar slug paths + pair paths with ≥1 listing (never localhost). Duplicate `/auto/:city` only in cities export. */
export async function buildCategorySitemapEntries(): Promise<SitemapEntry[]> {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];

  const now = new Date();
  const base = siteOriginForSeoFeeds();
  const out: SitemapEntry[] = [];

  const indexableWhere = seoIndexableListingWhere(now);

  const byCategory = await prisma.listing.groupBy({
    by: ['category'],
    where: indexableWhere,
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  for (const row of byCategory) {
    const slug = primarySlugForCategoryLabel(row.category);
    if (!slug) continue;
    out.push({
      url: `${base}/${slug}`,
      lastModified: row._max.updatedAt ?? now,
      changeFrequency: 'daily',
      priority: 0.75,
    });
  }

  const byPair = await prisma.listing.groupBy({
    by: ['category', 'city'],
    where: {
      ...indexableWhere,
      city: { not: null },
    },
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  const seenPairs = new Set<string>();
  for (const row of byPair) {
    if (!row.city) continue;
    if (row._count._all < MIN_INDEXABLE_HUB_LISTINGS) continue;
    const slug = primarySlugForCategoryLabel(row.category);
    if (!slug) continue;

    /** Auto+city URLs live exclusively in `/sitemap-cities.xml`. */
    if (row.category === AUTO_LABEL && slug === 'auto') continue;

    const cs = slugifyRo(row.city);
    const dedupeKey = `${slug}|${cs}`;
    if (seenPairs.has(dedupeKey)) continue;
    seenPairs.add(dedupeKey);

    out.push({
      url: `${base}/${slug}/${cs}`,
      lastModified: row._max.updatedAt ?? now,
      changeFrequency: 'daily',
      priority: 0.65,
    });
  }

  // Subcategory pages — only for subcategories that have at least 1 listing
  const bySubcategory = await prisma.listing.groupBy({
    by: ['category', 'subcategory'],
    where: {
      ...indexableWhere,
      subcategory: { not: null },
    },
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  const allSubSlugs = iterateAllSubcategorySlugs();
  const subLabelToSlug = new Map(allSubSlugs.map((s) => [`${s.categoryLabel}::${s.subcategoryLabel}`, s]));

  for (const row of bySubcategory) {
    if (!row.subcategory) continue;
    const key = `${row.category}::${row.subcategory}`;
    const mapped = subLabelToSlug.get(key);
    if (!mapped) continue;
    if (!shouldEmitCategorySubcategorySitemapPath(mapped)) continue;
    out.push({
      url: `${base}/${mapped.categorySlug}/${mapped.subcategorySlug}`,
      lastModified: row._max.updatedAt ?? now,
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }

  return out;
}

/** Only `/auto/{citySlug}` URLs that actually have listings in DB. */
export async function buildAutoCitySitemapEntries(): Promise<SitemapEntry[]> {
  if (process.env.USE_IN_MEMORY_DB === 'true') return [];

  const now = new Date();
  const base = siteOriginForSeoFeeds();

  const byPair = await prisma.listing.groupBy({
    by: ['category', 'city'],
    where: {
      ...seoIndexableListingWhere(now),
      category: AUTO_LABEL,
      city: { not: null },
    },
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  const seen = new Set<string>();
  const out: SitemapEntry[] = [];

  for (const row of byPair) {
    if (!row.city) continue;
    if (row._count._all < MIN_INDEXABLE_HUB_LISTINGS) continue;
    const cs = slugifyRo(row.city);
    if (seen.has(cs)) continue;
    seen.add(cs);
    out.push({
      url: `${base}/auto/${cs}`,
      lastModified: row._max.updatedAt ?? now,
      changeFrequency: 'daily',
      priority: 0.72,
    });
  }

  return out;
}
