import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { SeoMarketHubExtras } from "@/app/components/seo/SeoMarketHubExtras";
import {
  createPageMetadata,
  generateBreadcrumbStructuredData,
  generateFaqPageStructuredData,
} from "@/lib/seo";
import { buildCategoryPageJsonLd } from "@/lib/seo/collection-jsonld";
import { buildMarketHubFaqItems } from "@/lib/seo/market-hub-faq";
import {
  buildMarketIntro,
  canonicalCategorySlug,
  categorySlugToLabel,
  primarySlugForCategoryLabel,
  relatedCanonicalCategorySlugs,
  siblingCitiesForMarketSeo,
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
  SEO_NAV_CATEGORY_SLUGS,
} from "@/lib/seo/market-paths";
import { resolveSubcategoryBySlug, subcategorySlugsForCategory } from "@/lib/taxonomy";
import { absoluteUrl } from "@/lib/site-url";
import {
  getActiveListingCountForHub,
  getHubListingStats,
  getListingPreviewsForHub,
  resolveCityLabelForHub,
} from "@/lib/seo/hub-queries";
import { categoryCityHubShouldNoindex } from "@/lib/seo/hub-index-policy";
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

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categorySlug, citySlug } = await params;
  const sp = await searchParams;
  const canonicalSlug = canonicalCategorySlug(categorySlug);
  if (!canonicalSlug) {
    return createPageMetadata({
      title: "Pagină indisponibilă — ClickAnunț",
      description: "Această pagină nu este disponibilă.",
      canonicalPath: `/${categorySlug}/${citySlug}`,
      noindex: true,
    });
  }

  const primary = canonicalSlug;

  // Try subcategory resolution first
  const subResolved = resolveSubcategoryBySlug(primary, citySlug);
  if (subResolved) {
    return buildSubcategoryMetadata(primary, subResolved.category.label, subResolved.subcategory.label, citySlug, sp);
  }

  // Fall through: city resolution (static allowlist, then real DB cities)
  const city = await resolveCityLabelForHub(citySlug);
  if (!city) {
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

  const catPrimary = primarySlugForCategoryLabel(label) ?? canonicalSlug;
  const path = `/${catPrimary}/${citySlug}`;
  const shortCat = label.split(",")[0]?.trim() ?? label;
  const count = await getActiveListingCountForHub(label, city);
  const pageNum = parsePage(sp);
  const canonicalPath = pageNum <= 1 ? path : `${path}?page=${pageNum}`;

  return createPageMetadata({
    title:
      count > 0
        ? `${count} Anunțuri ${shortCat} în ${city} — găsește rapid | ClickAnunț`
        : `${shortCat} în ${city} — fără rezultate încă | ClickAnunț`,
    description:
      count > 0
        ? `${count} anunțuri ${label.toLowerCase()} în ${city}. Anunțuri verificate, contact direct cu vânzătorul. Publică gratuit pe ClickAnunț.`
        : `Nu există suficiente anunțuri publice ${label.toLowerCase()} în ${city} acum; încearcă orașe în apropiere sau publică gratuit pe ClickAnunț.`,
    canonicalPath,
    keywords: [shortCat, city, label, "anunțuri", "România", "ClickAnunț"],
    noindex: categoryCityHubShouldNoindex(count),
    ogImage: `${path}/opengraph-image`,
  });
}

async function buildSubcategoryMetadata(
  categorySlug: string,
  categoryLabel: string,
  subcategoryLabel: string,
  subcategorySlug: string,
  sp: Record<string, string | string[] | undefined>,
): Promise<Metadata> {
  const path = `/${categorySlug}/${subcategorySlug}`;
  const count = await getActiveListingCountForHub(categoryLabel, undefined, subcategoryLabel);
  const pageNum = parsePage(sp);
  const canonicalPath = pageNum <= 1 ? path : `${path}?page=${pageNum}`;

  return createPageMetadata({
    title:
      count > 0
        ? `${subcategoryLabel} — anunțuri ${categoryLabel.split(",")[0]?.trim()} | ClickAnunț`
        : `${subcategoryLabel} — fără rezultate încă | ClickAnunț`,
    description:
      count > 0
        ? `Anunțuri ${subcategoryLabel.toLowerCase()} din categoria ${categoryLabel.toLowerCase()} — publicate recent pe ClickAnunț. Filtre rapide, mesagerie gratuită.`
        : `Nu sunt anunțuri active pentru ${subcategoryLabel.toLowerCase()} momentan. Publică gratuit pe ClickAnunț.`,
    canonicalPath,
    keywords: [subcategoryLabel, categoryLabel.split(",")[0]?.trim() ?? categoryLabel, "anunțuri", "ClickAnunț"],
    noindex: count === 0,
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketCategoryCityOrSubcategoryPage({ params }: Omit<Props, "searchParams">) {
  const { categorySlug, citySlug } = await params;

  const canonicalSlug = canonicalCategorySlug(categorySlug);
  if (!canonicalSlug) notFound();

  const label = categorySlugToLabel(canonicalSlug);
  if (!label) notFound();

  const primary = primarySlugForCategoryLabel(label) ?? canonicalSlug;

  // Alias redirect
  if (categorySlug.toLowerCase() !== primary.toLowerCase()) {
    permanentRedirect(`/${primary}/${citySlug}`);
  }

  // Try subcategory resolution first
  const subResolved = resolveSubcategoryBySlug(primary, citySlug);
  if (subResolved) {
    return renderSubcategoryPage(primary, label, subResolved.subcategory.label, citySlug);
  }

  // Fall through: city resolution (static allowlist, then real DB cities)
  const city = await resolveCityLabelForHub(citySlug);
  if (!city) notFound();

  return renderCityPage(primary, label, city, citySlug);
}

// ---------------------------------------------------------------------------
// Subcategory page renderer
// ---------------------------------------------------------------------------

async function renderSubcategoryPage(
  categorySlug: string,
  categoryLabel: string,
  subcategoryLabel: string,
  subcategorySlug: string,
) {
  const routeBase = `/${categorySlug}/${subcategorySlug}`;

  const [count, previews] = await Promise.all([
    getActiveListingCountForHub(categoryLabel, undefined, subcategoryLabel),
    getListingPreviewsForHub(categoryLabel, undefined, 24, subcategoryLabel),
  ]);

  const shortCat = categoryLabel.split(",")[0]?.trim() ?? categoryLabel;
  const breadcrumbs = [
    { label: "Acasă", href: "/" },
    { label: shortCat, href: `/${categorySlug}` },
    { label: subcategoryLabel, href: routeBase },
  ];

  const crumbsLd = generateBreadcrumbStructuredData(
    breadcrumbs.map((b) => ({ name: b.label, url: b.href })),
  );

  const canonicalAbs = absoluteUrl(routeBase);
  const itemLd =
    previews.length > 0
      ? buildCategoryPageJsonLd({
          name: `Anunțuri ${subcategoryLabel}`,
          description: `Anunțuri ${subcategoryLabel.toLowerCase()} din ${categoryLabel.toLowerCase()} pe ClickAnunț`,
          canonicalUrlAbs: canonicalAbs,
          about: [subcategoryLabel, shortCat],
          items: previews.map((p) => ({ title: p.title, path: `/listings/${p.id}` })),
        })
      : null;

  const siblingSubcategories = subcategorySlugsForCategory(categorySlug)
    .filter((s) => s.slug !== subcategorySlug)
    .slice(0, 12);

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
        categorySlug={categorySlug}
        relatedCityLabels={[]}
        relatedCategorySlugs={[]}
        faqItems={[]}
        faqJsonLd={null}
        popularSearchLinks={[]}
        latestListingLinks={previews.slice(0, 8).map((p) => ({ label: p.title, href: `/listings/${p.id}` }))}
      />
      {/* Sibling subcategories navigation */}
      {siblingSubcategories.length > 0 && (
        <section className="mx-auto mb-8 max-w-7xl px-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Alte subcategorii în {shortCat}
            </p>
            <ul className="flex flex-wrap gap-2">
              {siblingSubcategories.map((sib) => (
                <li key={sib.slug}>
                  <a
                    href={`/${categorySlug}/${sib.slug}`}
                    className="inline-flex rounded-full border border-primary-400/25 bg-primary-500/[0.08] px-3 py-1.5 text-sm text-primary-100 transition-colors hover:border-primary-300/55"
                  >
                    {sib.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <ListingsView
        routeBase={routeBase}
        initialCategory={categoryLabel}
        pageTitle={`Anunțuri ${subcategoryLabel}`}
        seoIntro={
          <p>
            Anunțuri {subcategoryLabel.toLowerCase()} din categoria {categoryLabel.toLowerCase()} — publicate
            recent pe ClickAnunț. Folosește filtrele pentru a restrânge rezultatele.
          </p>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// City page renderer (existing behavior, extracted)
// ---------------------------------------------------------------------------

async function renderCityPage(
  primary: string,
  label: string,
  city: string,
  citySlug: string,
) {
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
      ? buildCategoryPageJsonLd({
          name: intro.h1,
          description: intro.paragraphs[0],
          canonicalUrlAbs: canonicalAbs,
          about: [label.split(",")[0]?.trim() ?? label, city],
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
