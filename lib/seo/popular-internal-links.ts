import { slugifyRo } from '@/lib/seo/slug';
import { SEO_HIGHLIGHT_CITY_LABELS } from '@/lib/seo/market-paths';

export type InternalNavLink = { label: string; href: string };

/**
 * Crawlable “popular searches” — query URLs and pillar hubs, not fake keywords.
 */
export function popularInternalLinksForCategoryHub(
  primarySlug: string,
  categoryLabel: string,
): InternalNavLink[] {
  const short = categoryLabel.split(',')[0]?.trim() ?? categoryLabel;
  const enc = encodeURIComponent(categoryLabel);
  const cities = [...SEO_HIGHLIGHT_CITY_LABELS].slice(0, 4);
  const links: InternalNavLink[] = [
    { label: `${short} — cele mai noi`, href: `/listings?category=${enc}&sort=newest` },
    { label: `${short} — preț crescător`, href: `/listings?category=${enc}&sort=priceAsc` },
    { label: `Toate categoriile`, href: `/listings` },
  ];
  for (const c of cities) {
    links.push({
      label: `${short} în ${c}`,
      href: `/${primarySlug}/${slugifyRo(c)}`,
    });
  }
  return links.slice(0, 10);
}

/** Cross-category navigation for the same city (crawl depth + topical breadth). */
export function sameCityOtherCategoryHubLinks(
  currentPrimarySlug: string,
  citySlug: string,
  cityLabel: string,
  labelsBySlug: Record<string, string>,
  candidateSlugs: readonly string[],
  limit: number,
): InternalNavLink[] {
  const out: InternalNavLink[] = [];
  for (const slug of candidateSlugs) {
    if (slug === currentPrimarySlug) continue;
    const label = labelsBySlug[slug]?.split(',')[0]?.trim() ?? slug;
    out.push({ label: `${label} în ${cityLabel}`, href: `/${slug}/${citySlug}` });
    if (out.length >= limit) break;
  }
  return out;
}
