import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { SeoMarketHubExtras } from "@/app/components/seo/SeoMarketHubExtras";
import {
  createPageMetadata,
  generateBreadcrumbStructuredData,
  generateFaqPageStructuredData,
  generateItemListStructuredData,
} from "@/lib/seo";
import { buildMarketHubFaqItems } from "@/lib/seo/market-hub-faq";
import {
  buildMarketIntro,
  canonicalCategorySlug,
  categorySlugToLabel,
  primarySlugForCategoryLabel,
  relatedCanonicalCategorySlugs,
  resolveCityLabelFromSlug,
  siblingCitiesForMarketSeo,
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
  SEO_NAV_CATEGORY_SLUGS,
} from "@/lib/seo/market-paths";
import { absoluteUrl } from "@/lib/site-url";
import {
  getActiveListingCountForHub,
  getHubListingStats,
  getListingPreviewsForHub,
} from "@/lib/seo/hub-queries";
import { buildProgrammaticHubParagraphs } from "@/lib/seo/programmatic-hub-copy";
import {
  popularInternalLinksForCategoryHub,
  sameCityOtherCategoryHubLinks,
} from "@/lib/seo/popular-internal-links";

type Props = {
  params: Promise<{ categorySlug: string; citySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parsePage(sp: Record<string, string | string[] | undefined>): number {
  const raw = sp.page;
  const pageStr = Array.isArray(raw) ? raw[0] : raw;
  return Math.max(1, Math.min(parseInt(pageStr || "1", 10), 500));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categorySlug, citySlug } = await params;
  const sp = await searchParams;
  const canonicalSlug = canonicalCategorySlug(categorySlug);
  const city = resolveCityLabelFromSlug(citySlug);
  if (!canonicalSlug || !city) {
    return createPageMetadata({
      title: "Pagină indisponibilă — ClickAnunț",
      description: "Această combinație categorie/oraș nu este disponibilă.",
      canonicalPath: `/${categorySlug}/${citySlug}`,
      noindex: true,
    });
  }

  const label = categorySlugToLabel(canonicalSlug);
  if (!label) {
    return createPageMetadata({
      title: "Pagină indisponibilă — ClickAnunț",
      description: "Categoria solicitată nu există în structura marketplace.",
      canonicalPath: `/${categorySlug}/${citySlug}`,
      noindex: true,
    });
  }

  const primary = primarySlugForCategoryLabel(label) ?? canonicalSlug;
  const path = `/${primary}/${citySlug}`;
  const shortCat = label.split(",")[0]?.trim() ?? label;
  const count = await getActiveListingCountForHub(label, city);
  const pageNum = parsePage(sp);
  const canonicalPath = pageNum <= 1 ? path : `${path}?page=${pageNum}`;

  return createPageMetadata({
    title:
      count > 0
        ? `${shortCat} în ${city} — anunțuri noi zilnic | ClickAnunț`
        : `${shortCat} în ${city} — fără rezultate încă | ClickAnunț`,
    description:
      count > 0
        ? `Explorează ${label.toLowerCase()} în ${city}: anunțuri verificate, mesagerie gratuită și căutare rapidă între subcategorii pe www.clickanunt.ro.`
        : `Nu există suficiente anunțuri publice ${label.toLowerCase()} în ${city} acum; încearcă orașe în apropiere sau publică gratuit pe ClickAnunț.`,
    canonicalPath,
    keywords: [shortCat, city, label, "anunțuri", "România", "ClickAnunț"],
    noindex: count === 0,
    ogImage: `${path}/opengraph-image`,
  });
}

export default async function MarketCategoryCityPage({ params }: Omit<Props, "searchParams">) {
  const { categorySlug, citySlug } = await params;

  const canonicalSlug = canonicalCategorySlug(categorySlug);
  const city = resolveCityLabelFromSlug(citySlug);
  if (!canonicalSlug || !city) notFound();

  const label = categorySlugToLabel(canonicalSlug);
  if (!label) notFound();

  const primary = primarySlugForCategoryLabel(label) ?? canonicalSlug;
  /** Aliasuri → canon (ex.: telefoane → electronice). */
  if (categorySlug.toLowerCase() !== primary.toLowerCase()) {
    permanentRedirect(`/${primary}/${citySlug}`);
  }

  const routeBase = `/${primary}/${citySlug}`;
  const intro = buildMarketIntro(label, city);

  const [count, previews, stats] = await Promise.all([
    getActiveListingCountForHub(label, city),
    getListingPreviewsForHub(label, city, 24),
    getHubListingStats(label, city),
  ]);

  const programmatic = buildProgrammaticHubParagraphs({ categoryLabel: label, cityLabel: city, stats });
  const popularLinks = popularInternalLinksForCategoryHub(primary, label);
  const latestLinks = previews.slice(0, 10).map((p) => ({
    label: p.title,
    href: `/listings/${p.id}`,
  }));
  const crossCityCats = sameCityOtherCategoryHubLinks(
    primary,
    citySlug,
    city,
    CATEGORY_LABEL_BY_CANONICAL_SLUG,
    SEO_NAV_CATEGORY_SLUGS,
    10,
  );

  const breadcrumbs = [
    { label: "Acasă", href: "/" },
    { label: label.split(",")[0]?.trim() ?? primary, href: `/${primary}` },
    { label: city, href: routeBase },
  ];

  const crumbsLd = generateBreadcrumbStructuredData(
    breadcrumbs.map((b) => ({ name: b.label, url: b.href })),
  );

  const canonicalAbs = absoluteUrl(routeBase);

  const itemLd =
    previews.length > 0
      ? generateItemListStructuredData({
          name: intro.h1,
          description: intro.paragraphs[0],
          canonicalUrlAbs: canonicalAbs,
          items: previews.map((p) => ({ title: p.title, path: `/listings/${p.id}` })),
        })
      : null;

  const relatedCityLabels = siblingCitiesForMarketSeo(city, 14);
  const relatedCats = relatedCanonicalCategorySlugs(primary, 8);
  const faqItems = buildMarketHubFaqItems(label, city);
  const faqJsonLd = count > 0 ? generateFaqPageStructuredData([...faqItems]) : null;

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      {itemLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemLd) }}
        />
      ) : null}
      <Navbar />
      <SeoMarketHubExtras
        breadcrumbs={breadcrumbs}
        categorySlug={primary}
        relatedCityLabels={[...relatedCityLabels]}
        relatedCategorySlugs={relatedCats}
        faqItems={count > 0 ? faqItems : []}
        faqJsonLd={faqJsonLd}
        popularSearchLinks={popularLinks}
        latestListingLinks={latestLinks}
        sameCityOtherCategories={crossCityCats}
      />
      <ListingsView
        routeBase={routeBase}
        initialCategory={label}
        initialCity={city}
        pageTitle={intro.h1}
        seoIntro={
          <>
            {intro.paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
            {programmatic.map((p, idx) => (
              <p key={`prog-${idx}`}>{p}</p>
            ))}
          </>
        }
      />
    </div>
  );
}
