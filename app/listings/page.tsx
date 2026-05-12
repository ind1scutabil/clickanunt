import React, { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";
import { createPageMetadata } from "@/lib/seo";
import { siteOrigin } from "@/lib/site-url";

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
    description:
      "Răsfoiește mii de anunțuri verificate în toată România: automobile, proprietăți, telefoane, electrocasnice și locuri de muncă. Publică gratuit pe ClickAnunț.",
    canonicalUrl,
    keywords: ["anunțuri România", "marketplace", "ClickAnunț"],
  });
}

export default function Page() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 md:from-[#f3f5fb] md:via-[#f6f7fa] md:to-slate-100/90">
      <Navbar />
      <div className="relative min-w-0 max-w-full md:text-slate-700">
        <Suspense fallback={<div className="p-8 text-center text-zinc-500 md:text-slate-500">Se încarcă anunțurile...</div>}>
          <ListingsView />
        </Suspense>
      </div>
    </div>
  );
}
