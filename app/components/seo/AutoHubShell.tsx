import Navbar from '@/app/components/Navbar';
import ListingsView from '@/app/components/ListingsView';
import { SeoMarketHubExtras, type SeoBreadcrumbLink } from '@/app/components/seo/SeoMarketHubExtras';
import { AUTO_CATEGORY_LABEL } from '@/lib/seo/auto-hub-resolve';
import type { MarketHubFaqItem } from '@/lib/seo/market-hub-faq';
import type { InternalNavLink } from '@/lib/seo/popular-internal-links';
import type { AutoHubIntro } from '@/lib/seo/auto-hub-copy';
import type { ListingPreviewMini } from '@/lib/seo/hub-queries';
import { absoluteUrl } from '@/lib/site-url';
import {
  generateBreadcrumbStructuredData,
  generateFaqPageStructuredData,
  generateItemListStructuredData,
} from '@/lib/seo';

type Props = {
  routeBase: string;
  breadcrumbs: SeoBreadcrumbLink[];
  intro: AutoHubIntro;
  extraParagraphs?: string[];
  initialMake?: string;
  initialModel?: string;
  initialCity?: string;
  faqItems: MarketHubFaqItem[];
  count: number;
  previews: ListingPreviewMini[];
  makeModelLinks?: InternalNavLink[];
  modelCityLinks?: InternalNavLink[];
  pillarLinks?: InternalNavLink[];
  canonicalPath: string;
};

export function AutoHubShell({
  routeBase,
  breadcrumbs,
  intro,
  extraParagraphs = [],
  initialMake,
  initialModel,
  initialCity,
  faqItems,
  count,
  previews,
  makeModelLinks = [],
  modelCityLinks = [],
  pillarLinks = [],
  canonicalPath,
}: Props) {
  const crumbsLd = generateBreadcrumbStructuredData(
    breadcrumbs.map((b) => ({ name: b.label, url: b.href })),
  );

  const canonicalAbs = absoluteUrl(canonicalPath);

  const itemLd =
    previews.length > 0
      ? generateItemListStructuredData({
          name: intro.h1,
          description: intro.paragraphs[0],
          canonicalUrlAbs: canonicalAbs,
          items: previews.map((p) => ({ title: p.title, path: `/listings/${p.id}` })),
        })
      : null;

  const faqJsonLd = count > 0 && faqItems.length > 0 ? generateFaqPageStructuredData([...faqItems]) : null;

  const latestLinks = previews.slice(0, 10).map((p) => ({
    label: p.title,
    href: `/listings/${p.id}`,
  }));

  const popularLinks = [...makeModelLinks, ...modelCityLinks, ...pillarLinks].slice(0, 28);

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }} />
      {itemLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemLd) }} />
      ) : null}
      <Navbar />
      <SeoMarketHubExtras
        breadcrumbs={breadcrumbs}
        categorySlug="auto"
        relatedCityLabels={[]}
        relatedCategorySlugs={[]}
        faqItems={count > 0 ? faqItems : []}
        faqJsonLd={faqJsonLd}
        popularSearchLinks={popularLinks}
        latestListingLinks={latestLinks}
      />
      <ListingsView
        routeBase={routeBase}
        initialCategory={AUTO_CATEGORY_LABEL}
        initialMake={initialMake}
        initialModel={initialModel}
        initialCity={initialCity}
        pageTitle={intro.h1}
        seoIntro={
          <>
            {intro.paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
            {extraParagraphs.map((paragraph, idx) => (
              <p key={`extra-${idx}`}>{paragraph}</p>
            ))}
          </>
        }
      />
    </div>
  );
}
