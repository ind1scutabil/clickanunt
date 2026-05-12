import Link from 'next/link';
import { CATEGORY_LABEL_BY_CANONICAL_SLUG } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';
import type { MarketHubFaqItem } from '@/lib/seo/market-hub-faq';
import type { InternalNavLink } from '@/lib/seo/popular-internal-links';

export type SeoBreadcrumbLink = { label: string; href: string };

type Props = {
  breadcrumbs: SeoBreadcrumbLink[];
  categorySlug: string;
  relatedCityLabels: readonly string[];
  relatedCategorySlugs: readonly string[];
  /** FAQ copy + matching JSON-LD (FAQPage) when non-empty */
  faqItems?: readonly MarketHubFaqItem[];
  faqJsonLd?: object | null;
  popularSearchLinks?: readonly InternalNavLink[];
  latestListingLinks?: readonly InternalNavLink[];
  /** City hub only: other category hubs with same city slug */
  sameCityOtherCategories?: readonly InternalNavLink[];
  showTrustPanel?: boolean;
};

function shortCatLabel(canonicalSlug: string): string {
  const full = CATEGORY_LABEL_BY_CANONICAL_SLUG[canonicalSlug];
  return full?.split(',')[0]?.trim() ?? canonicalSlug;
}

function LinkPills({
  id,
  title,
  links,
}: {
  id: string;
  title: string;
  links: readonly InternalNavLink[];
}) {
  if (links.length === 0) return null;
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.75)] transition-[border-color,box-shadow] duration-normal ease-premium hover:border-white/12"
    >
      <h2 id={id} className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((l, i) => (
          <li key={`${l.href}-${i}`}>
            <Link
              href={l.href}
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:border-primary-400/35 hover:text-primary-100"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Breadcrumbs + crawlable internal linking for pillar and city hubs (server-rendered). */
export function SeoMarketHubExtras({
  breadcrumbs,
  categorySlug,
  relatedCityLabels,
  relatedCategorySlugs,
  faqItems = [],
  faqJsonLd = null,
  popularSearchLinks = [],
  latestListingLinks = [],
  sameCityOtherCategories = [],
  showTrustPanel = true,
}: Props) {
  return (
    <div className="mx-auto mb-10 max-w-7xl space-y-8 px-4">
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <nav
        aria-label="Breadcrumb"
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-neutral-400"
      >
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
                Orașe în apropiere
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
                Categorii înrudite
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

      <div className="grid gap-8 lg:grid-cols-2">
        <LinkPills id="seo-popular-searches" title="Căutări și filtre rapide" links={popularSearchLinks} />
        <LinkPills id="seo-latest-listings" title="Cele mai recente în index" links={latestListingLinks} />
      </div>

      {sameCityOtherCategories.length > 0 ? (
        <LinkPills
          id="seo-same-city-cats"
          title="Alte categorii în același oraș"
          links={sameCityOtherCategories}
        />
      ) : null}

      {showTrustPanel ? (
        <section
          aria-labelledby="seo-trust-heading"
          className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-5"
        >
          <h2 id="seo-trust-heading" className="mb-2 text-sm font-semibold text-amber-100">
            Încredere & siguranță
          </h2>
          <p className="mb-3 text-sm text-amber-50/90">
            Nu trimite bani în avans; verifică produsul sau proprietatea înainte de plată. Raportează anunțurile suspecte
            din pagina anunțului — moderarea analizează semnalările.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-amber-200/95">
            <li>
              <Link href="/security" className="hover:text-white hover:underline">
                Siguranță
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white hover:underline">
                Termeni
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white hover:underline">
                Despre noi
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      {faqItems.length > 0 && (
        <section
          aria-labelledby="seo-hub-faq-heading"
          className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-6"
        >
          <h2 id="seo-hub-faq-heading" className="mb-4 text-lg font-semibold text-white">
            Întrebări frecvente
          </h2>
          <dl className="space-y-5">
            {faqItems.map((item) => (
              <div key={item.question} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <dt className="font-medium text-primary-100">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-neutral-300">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
