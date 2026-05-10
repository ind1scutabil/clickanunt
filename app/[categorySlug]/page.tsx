import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { SeoMarketHubExtras } from "@/app/components/seo/SeoMarketHubExtras";
import {
  canonicalCategorySlug,
  categorySlugToLabel,
  primarySlugForCategoryLabel,
  buildNationwideMarketIntro,
  relatedCanonicalCategorySlugs,
  SEO_HIGHLIGHT_CITY_LABELS,
} from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import { createPageMetadata, generateBreadcrumbStructuredData, generateItemListStructuredData } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { getActiveListingCountForHub, getListingPreviewsForHub } from "@/lib/seo/hub-queries";

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const canonicalSlug = canonicalCategorySlug(categorySlug);
  if (!canonicalSlug) {
    return createPageMetadata({
      title: "Pagină indisponibilă — ClickAnunț",
      description: "Categoria solicitată nu există.",
      canonicalPath: `/${categorySlug}`,
      noindex: true,
    });
  }

  const label = categorySlugToLabel(canonicalSlug);
  if (!label) {
    return createPageMetadata({
      title: "Pagină indisponibilă — ClickAnunț",
      description: "Categoria solicitată nu există în structura marketplace.",
      canonicalPath: `/${categorySlug}`,
      noindex: true,
    });
  }

  const primary = primarySlugForCategoryLabel(label) ?? canonicalSlug;
  const path = `/${primary}`;
  const shortCat = label.split(",")[0]?.trim() ?? label;
  const count = await getActiveListingCountForHub(label);

  return createPageMetadata({
    title:
      count > 0
        ? `Anunțuri ${shortCat} în România — căută pe oraș | ClickAnunț`
        : `Anunțuri ${shortCat} — rezultate limitate | ClickAnunț`,
    description:
      count > 0
        ? `Listează anunțuri ${label.toLowerCase()} în toată România: căută pe oraș, filtrează după subcategorie și preț și publică gratuit pe www.clickanunt.ro.`
        : `Momentan nu există suficient conținut public în ${shortCat}; explorează alte categorii sau publică gratuit pe ClickAnunț.`,
    canonicalPath: path,
    keywords: [shortCat, label, "anunțuri", "România", "ClickAnunț"],
    noindex: count === 0,
  });
}

export default async function MarketCategoryOnlyPage({ params }: Props) {
  const { categorySlug } = await params;

  const canonicalSlug = canonicalCategorySlug(categorySlug);
  if (!canonicalSlug) notFound();

  const label = categorySlugToLabel(canonicalSlug);
  if (!label) notFound();

  const primary = primarySlugForCategoryLabel(label) ?? canonicalSlug;

  /** 308 către slash-ul canonic pentru alias-uri (telefoane → electronice). */
  if (categorySlug.toLowerCase() !== primary.toLowerCase()) permanentRedirect(`/${primary}`);

  const routeBase = `/${primary}`;
  const intro = buildNationwideMarketIntro(label);

  const [count, previews] = await Promise.all([
    getActiveListingCountForHub(label),
    getListingPreviewsForHub(label, undefined, 24),
  ]);

  const breadcrumbs = [{ label: "Acasă", href: "/" }];
  const shortLab = label.split(",")[0]?.trim() ?? label;
  breadcrumbs.push({ label: shortLab, href: routeBase });

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

  const relatedCats = relatedCanonicalCategorySlugs(primary, 8);
  const pillarCityLinks = [...SEO_HIGHLIGHT_CITY_LABELS].slice(0, 12);

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
        relatedCityLabels={[...pillarCityLinks]}
        relatedCategorySlugs={relatedCats}
      />
      {count > 0 && (
        <section className="mx-auto mb-10 max-w-7xl px-4" aria-labelledby="explore-city-hubs-label">
          <h2 id="explore-city-hubs-label" className="sr-only">
            Intră în anunțuri pe orașe populare în această categorie
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Anunțuri pe orașe
            </p>
            <ul className="flex flex-wrap gap-2">
              {pillarCityLinks.map((city) => (
                <li key={city}>
                  <a
                    href={`/${primary}/${slugifyRo(city)}`}
                    className="inline-flex rounded-full border border-primary-400/25 bg-primary-500/[0.08] px-3 py-1.5 text-sm text-primary-100 transition-colors hover:border-primary-300/55"
                  >
                    {city}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <ListingsView
        routeBase={routeBase}
        initialCategory={label}
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
