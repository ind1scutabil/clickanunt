import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { SeoMarketHubExtras } from "@/app/components/seo/SeoMarketHubExtras";
import { createPageMetadata, generateBreadcrumbStructuredData, generateItemListStructuredData } from "@/lib/seo";
import {
  buildMarketIntro,
  canonicalCategorySlug,
  categorySlugToLabel,
  primarySlugForCategoryLabel,
  relatedCanonicalCategorySlugs,
  resolveCityLabelFromSlug,
  siblingCitiesForMarketSeo,
} from "@/lib/seo/market-paths";
import { absoluteUrl } from "@/lib/site-url";
import { getActiveListingCountForHub, getListingPreviewsForHub } from "@/lib/seo/hub-queries";

type Props = {
  params: Promise<{ categorySlug: string; citySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, citySlug } = await params;
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

  return createPageMetadata({
    title:
      count > 0
        ? `${shortCat} în ${city} — anunțuri noi zilnic | ClickAnunț`
        : `${shortCat} în ${city} — fără rezultate încă | ClickAnunț`,
    description:
      count > 0
        ? `Explorează ${label.toLowerCase()} în ${city}: anunțuri verificate, mesagerie gratuită și căutare rapidă între subcategorii pe www.clickanunt.ro.`
        : `Nu există suficiente anunțuri publice ${label.toLowerCase()} în ${city} acum; încearcă orașe în apropiere sau publică gratuit pe ClickAnunț.`,
    canonicalPath: path,
    keywords: [shortCat, city, label, "anunțuri", "România", "ClickAnunț"],
    noindex: count === 0,
  });
}

export default async function MarketCategoryCityPage({ params }: Props) {
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

  const previews = await getListingPreviewsForHub(label, city, 24);
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
          </>
        }
      />
    </div>
  );
}
