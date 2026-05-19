import { prisma } from '@/lib/prisma';
import { slugifyRo } from '@/lib/seo/slug';
import type { SitemapEntry } from '@/lib/seo';
import { seoIndexableListingWhere } from '@/lib/seo/indexable-listing-where';
import { primarySlugForCategoryLabel } from '@/lib/seo/market-paths';
import { siteOriginForSeoFeeds } from '@/lib/seo/site-url-guard';

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
  });

  for (const row of byCategory) {
    const slug = primarySlugForCategoryLabel(row.category);
    if (!slug) continue;
    out.push({
      url: `${base}/${slug}`,
      lastModified: now,
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
  });

  const seenPairs = new Set<string>();
  for (const row of byPair) {
    if (!row.city) continue;
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
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.65,
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
  });

  const seen = new Set<string>();
  const out: SitemapEntry[] = [];

  for (const row of byPair) {
    if (!row.city) continue;
    const cs = slugifyRo(row.city);
    if (seen.has(cs)) continue;
    seen.add(cs);
    out.push({
      url: `${base}/auto/${cs}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.72,
    });
  }

  return out;
}
