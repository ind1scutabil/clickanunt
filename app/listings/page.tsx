import React, { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { createPageMetadata } from "@/lib/seo";
import { buildCollectionPageJsonLd } from "@/lib/seo/collection-jsonld";
import { absoluteUrl, siteOrigin } from "@/lib/site-url";
import {
  getPublicBrowseListingsPage,
  parsePublicBrowseFiltersFromSearchParams,
  publicBrowseFiltersSignature,
} from "@/lib/listings/public-browse-server";
import { prisma } from "@/lib/prisma";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";

function listingsCanonical(sp: Record<string, string | string[] | undefined>): string {
  const get = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);
  const pairs = new Map<string, string>();

  const searchLegacy = get("search");
  const query = get("q");
  if (searchLegacy) pairs.set("search", searchLegacy);
  else if (query) pairs.set("q", query);

  const passthrough = ["category", "subcategory", "county", "city", "make", "model", "fuel"] as const;
  for (const k of passthrough) {
    const v = get(k);
    if (v) pairs.set(k, v);
  }

  const page = get("page");
  if (page && page !== "1") pairs.set("page", page);

  const keys = [...pairs.keys()].sort();
  const u = new URLSearchParams();
  for (const k of keys) u.set(k, pairs.get(k)!);

  const qs = u.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const pick = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);
  const q = pick("q") ?? pick("search");
  const category = pick("category");
  const city = pick("city");
  const canonicalPath = listingsCanonical(sp);
  const canonicalUrl = canonicalPath.startsWith("http") ? canonicalPath : `${siteOrigin()}${canonicalPath}`;

  if (q) {
    const safe = q.length > 80 ? `${q.slice(0, 80)}…` : q;
    return createPageMetadata({
      title: `Căutare «${safe}» — anunțuri România | ClickAnunț`,
      description: `Rezultate pentru «${safe}» în anunțurile ClickAnunț din România. Filtrează după categorie și localitate, contactează vânzătorii gratuit.`,
      canonicalUrl,
      keywords: ["căutare anunțuri", q, "ClickAnunț"],
    });
  }

  if (category && city) {
    const short = category.split(",")[0]?.trim() ?? category;
    return createPageMetadata({
      title: `Anunțuri ${short} în ${city} — marketplace ClickAnunț`,
      description: `Descoperă anunțuri ${category.toLowerCase()} disponibile în ${city}. Produse și servicii verificate cu filtre pentru preț și sortare.`,
      canonicalUrl,
      keywords: [category, city, "anunțuri", "ClickAnunț"],
    });
  }

  if (category) {
    const short = category.split(",")[0]?.trim() ?? category;
    return createPageMetadata({
      title: `Anunțuri ${short} — vânzări în România | ClickAnunț`,
      description: `Listează și răsfoiește anunțuri ${category.toLowerCase()} pe ClickAnunț — publicare gratuită, mesaje în timp real și protecție anti-fraudă.`,
      canonicalUrl,
      keywords: [category, "anunțuri gratuite", "România"],
    });
  }

  if (city) {
    return createPageMetadata({
      title: `Anunțuri în ${city} — vânzări locale ClickAnunț`,
      description: `Anunțuri locale și regionale disponibile pentru ${city}. Găsește rapid proprietăți, vehicule, electronice și servicii apropiate de tine.`,
      canonicalUrl,
      keywords: [city, "anunțuri locale", "ClickAnunț"],
    });
  }

  return createPageMetadata({
    title: "Toate anunțurile — Auto, Case, Electronice și Joburi în România | ClickAnunț",
    description: await (async () => {
      if (process.env.USE_IN_MEMORY_DB === "true") {
        return "Explorează anunțurile publicate pe ClickAnunț — auto, imobiliare, electronice și servicii în România.";
      }
      try {
        const count = await prisma.listing.count({ where: seoIndexableListingWhere() });
        if (count > 0) {
          return `${count} anunțuri publice active în România: automobile, proprietăți, telefoane, electrocasnice și locuri de muncă. Publică gratuit pe ClickAnunț.`;
        }
      } catch {
        /* fall through */
      }
      return "Explorează anunțurile publicate pe ClickAnunț — auto, imobiliare, electronice și servicii în România.";
    })(),
    canonicalUrl,
    keywords: ["anunțuri România", "marketplace", "ClickAnunț"],
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const filters = parsePublicBrowseFiltersFromSearchParams(sp);
  const pageParam = parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const browseSeed = await getPublicBrowseListingsPage({
    page,
    limit: 12,
    filters,
  });

  const ssrSignature = publicBrowseFiltersSignature(filters, page);

  const itemListLd =
    browseSeed.listings.length > 0 && !filters.q && !filters.category && !filters.city
      ? buildCollectionPageJsonLd({
          name: "Toate anunțurile pe ClickAnunț",
          description:
            "Catalog public de anunțuri active în România — auto, imobiliare, electronice și alte categorii.",
          canonicalUrlAbs: absoluteUrl("/listings"),
          items: browseSeed.listings.map((l) => ({
            title: l.title,
            path: `/listings/${l.id}`,
          })),
        })
      : null;

  return (
    <div className="relative min-h-screen max-w-[100vw] overflow-x-hidden bg-[#030304] text-zinc-100 antialiased selection:bg-orange-500/25">
      {itemListLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.07),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_36%_at_100%_0%,rgba(139,92,246,0.05),transparent_50%)]"
        aria-hidden
      />
      <Navbar />
      <div className="relative min-w-0 max-w-full text-zinc-100">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
              <div className="relative mx-auto max-w-md overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/95 px-6 py-12 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.05]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
                <div
                  className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-orange-500"
                  aria-hidden
                />
                <p className="mt-4 text-sm font-medium text-zinc-500">Se încarcă anunțurile…</p>
              </div>
            </div>
          }
        >
          <ListingsView
            initialListings={browseSeed.listings}
            initialTotal={browseSeed.total}
            initialPage={browseSeed.page}
            ssrFiltersSignature={ssrSignature}
          />
        </Suspense>
      </div>
    </div>
  );
}
