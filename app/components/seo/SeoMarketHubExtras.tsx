import Link from 'next/link';
import { CATEGORY_LABEL_BY_CANONICAL_SLUG } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';

export type SeoBreadcrumbLink = { label: string; href: string };

type Props = {
  breadcrumbs: SeoBreadcrumbLink[];
  categorySlug: string;
  relatedCityLabels: readonly string[];
  relatedCategorySlugs: readonly string[];
};

function shortCatLabel(canonicalSlug: string): string {
  const full = CATEGORY_LABEL_BY_CANONICAL_SLUG[canonicalSlug];
  return full?.split(',')[0]?.trim() ?? canonicalSlug;
}

/** Breadcrumbs + internal links for pillar and city hubs (server-rendered). */
export function SeoMarketHubExtras({
  breadcrumbs,
  categorySlug,
  relatedCityLabels,
  relatedCategorySlugs,
}: Props) {
  return (
    <div className="mx-auto mb-10 max-w-7xl space-y-8 px-4">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-400">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {breadcrumbs.map((crumb, idx) => {
            const last = idx === breadcrumbs.length - 1;
            return (
              <li key={`${crumb.href}-${idx}`} className="inline-flex items-center gap-2">
                {idx > 0 && <span className="text-neutral-600" aria-hidden>/</span>}
                {last ? (
                  <span className="font-medium text-white/80">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-primary-300 transition-colors hover:text-primary-100"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {(relatedCityLabels.length > 0 || relatedCategorySlugs.length > 0) && (
        <div className="grid gap-8 md:grid-cols-2">
          {relatedCityLabels.length > 0 && (
            <section aria-labelledby="seo-related-cities" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 id="seo-related-cities" className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Orașe apropiate
              </h2>
              <ul className="flex flex-wrap gap-2">
                {relatedCityLabels.map((city) => (
                  <li key={city}>
                    <Link
                      href={`/${categorySlug}/${slugifyRo(city)}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:border-primary-400/35 hover:text-primary-100"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {relatedCategorySlugs.length > 0 && (
            <section aria-labelledby="seo-related-cats" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 id="seo-related-cats" className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Alte categorii
              </h2>
              <ul className="flex flex-wrap gap-2">
                {relatedCategorySlugs.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:border-secondary-400/35 hover:text-secondary-100"
                    >
                      {shortCatLabel(slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
