"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { ALL_CATEGORIES } from "@/lib/carData";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { Card } from "@/app/components/ui";
import { StatsStripSafe } from "@/app/components/enterprise";
import { HomeDiscoverShelf } from "@/app/components/HomeDiscoverShelf";
import { HOME_CATEGORY_CARD_META } from "@/lib/home-category-meta";
import { CATEGORY_STOCK_PHOTO } from "@/lib/home-category-stock-photos";
import { formatRoInteger } from "@/lib/format-ro";
import { HomeAboveFoldPreviews } from "@/app/components/home/HomeAboveFoldPreviews";
import { HomeRecentlyViewed } from "@/app/components/home/HomeRecentlyViewed";
import { HomeCategoryStockImage } from "@/app/components/home/HomeCategoryStockImage";
import { HomePremiumHero } from "@/app/components/home/HomePremiumHero";
import { HomeAutoVerificationPremium } from "@/app/components/home/HomeAutoVerificationPremium";

const TRENDING_SEARCHES = [
  "BMW X5",
  "Apartament București",
  "iPhone 15",
  "Angajări IT",
  "Tractor second hand",
  "Canapea extensibilă",
];

/** Short labels for horizontal category chips — full category string for URLs/API. */
const CATEGORY_CHIP_LABEL: Record<string, string> = {
  "Auto, moto și ambarcațiuni": "Auto",
  Imobiliare: "Imobiliare",
  "Electronice și electrocasnice": "Electronice",
  "Modă și frumusețe": "Modă",
  "Casă și grădină": "Casă",
  "Locuri de muncă": "Joburi",
  "Servicii și afaceri": "Servicii",
  "Sport, timp liber și artă": "Sport",
};

const CATEGORY_PREVIEW_TAGS: Record<string, string[]> = {
  "Auto, moto și ambarcațiuni": ["SUV premium", "Interior piele", "Faruri LED"],
  Imobiliare: ["Apartamente", "Bucătării moderne", "Living premium"],
  "Electronice și electrocasnice": ["Telefoane", "Gaming setup", "Laptopuri"],
  "Modă și frumusețe": ["Colecții noi", "Lifestyle", "Accesorii"],
  "Casă și grădină": ["Canapele", "Scandinav", "Decor"],
  "Locuri de muncă": ["Office modern", "Echipe active", "Remote / Hybrid"],
};

/** Category shortcuts — premium glass tile (fixed widths in globals.css). */
const HOME_SHORTCUT_CATEGORY_LINK_CLASS =
  "home-shortcut-tile-link group relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.055] bg-gradient-to-b from-white/[0.05] to-[rgb(16,18,24)] motion-reduce:transition-none hover:-translate-y-px hover:border-white/[0.085] motion-reduce:hover:translate-y-0";

type HomePageClientProps = {
  editorialStrip?: ReactNode;
  /** Din Server Component — același snapshot la hidratare ca la HTML-ul generat server-side */
  initialActiveListings?: number | null;
  initialCategoryCounts?: Record<string, number>;
  initialCategoryStatsError?: boolean;
};

export default function HomePageClient({
  editorialStrip,
  initialActiveListings = null,
  initialCategoryCounts = {},
  initialCategoryStatsError = true,
}: HomePageClientProps) {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(initialCategoryCounts);
  const [categoryCountsError, setCategoryCountsError] = useState(initialCategoryStatsError);
  const [activeListingsTotal, setActiveListingsTotal] = useState<number | null>(initialActiveListings);

  const serverStatsProvided = initialCategoryStatsError === false;

  useEffect(() => {
    if (serverStatsProvided) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { available?: boolean; activeListings?: number };
        if (!cancelled && data.available !== false && typeof data.activeListings === "number") {
          setActiveListingsTotal(data.activeListings);
          return;
        }
        if (!cancelled && data.available === false) {
          setActiveListingsTotal(null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverStatsProvided]);

  useEffect(() => {
    if (serverStatsProvided) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats/by-category", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setCategoryCountsError(true);
          }
          return;
        }
        const data = (await res.json()) as { counts?: Record<string, number> };
        if (!cancelled) {
          setCategoryCounts(data.counts ?? {});
          setCategoryCountsError(false);
        }
      } catch {
        if (!cancelled) {
          setCategoryCountsError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverStatsProvided]);

  const popularCategories = new Set([
    "Auto, moto și ambarcațiuni",
    "Imobiliare",
    "Electronice și electrocasnice",
    "Modă și frumusețe",
    "Casă și grădină",
    "Locuri de muncă",
    "Servicii și afaceri",
    "Sport, timp liber și artă",
  ]);

  const shortcutCategories = ALL_CATEGORIES.filter((c) => popularCategories.has(c)).slice(0, 8);

  const handleSearch = (query: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    if (category) params.append("category", category);
    router.push(`/listings?${params.toString()}`);
  };

  const listingsCta =
    activeListingsTotal !== null
      ? `${formatRoInteger(activeListingsTotal)} anunțuri în catalog`
      : "Deschide catalogul";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0c0d10] text-zinc-100">
        <HomePremiumHero
          heroSearch={heroSearch}
          setHeroSearch={setHeroSearch}
          onSubmitSearch={(q) => handleSearch(q)}
          trendingTerms={TRENDING_SEARCHES}
          onTrendingClick={(term) => handleSearch(term)}
          listingsCta={listingsCta}
          verificationSlot={<HomeAutoVerificationPremium />}
          previewsSlot={
            <>
              <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Recent în catalog
              </p>
              <HomeAboveFoldPreviews variant="premium" />
            </>
          }
        />

        <HomeRecentlyViewed variant="premium" />

        {/* Category shortcuts */}
        <section className="border-b border-white/[0.05] bg-gradient-to-b from-[#14161c] via-[#12141a] to-[#101218] py-5 sm:py-6">
          <div className="mx-auto max-w-7xl px-4">
            <p className="mb-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500/90 sm:mb-4">
              Categorii populare
            </p>
            <div className="-mx-1 flex gap-3.5 overflow-x-auto scroll-pl-4 px-1 pb-1.5 pt-0.5 [scrollbar-width:thin] sm:flex-wrap sm:justify-center sm:gap-4 md:overflow-visible md:gap-4">
              {shortcutCategories.map((categoryName, si) => {
                const meta = HOME_CATEGORY_CARD_META[categoryName] ?? {
                  icon: "other" as const,
                  sub: "",
                };
                const pillarSlug = primarySlugForCategoryLabel(categoryName);
                const href =
                  pillarSlug !== null ? `/${pillarSlug}` : `/listings?category=${encodeURIComponent(categoryName)}`;
                const label = CATEGORY_CHIP_LABEL[categoryName] ?? categoryName.slice(0, 14);
                const photo = CATEGORY_STOCK_PHOTO[meta.icon];
                return (
                  <Link
                    key={categoryName}
                    href={href}
                    prefetch={false}
                    className={`${HOME_SHORTCUT_CATEGORY_LINK_CLASS} snap-start`}
                  >
                    <div
                      className="home-category-photo-cover relative aspect-[5/4] w-full overflow-hidden bg-[#252a35]"
                      style={{ backgroundImage: `url('${photo.src}')` }}
                    >
                      <HomeCategoryStockImage
                        src={photo.src}
                        alt={photo.alt}
                        iconKey={meta.icon}
                        sizes="160px"
                        priority={si < 8}
                        catalogLook={false}
                        imageClassName="z-[1] object-cover object-center transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 group-hover:brightness-[1.03]"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-[#0a0b0e]/35 via-transparent to-[#07080c]/65"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[58%] bg-gradient-to-t from-[#07080c]/90 via-[#07080c]/25 to-transparent"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08)_0%,transparent_55%)] opacity-70"
                        aria-hidden
                      />
                    </div>
                    <span className="relative border-t border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-[rgba(12,14,18,0.92)] px-2.5 py-2.5 text-center text-[11px] font-semibold leading-tight tracking-[-0.01em] text-zinc-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:py-2.5">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Full category browse */}
        <section className="border-t border-white/[0.04] bg-gradient-to-b from-[#0e1015] via-[#0c0e13] to-[#0a0c10] py-8 md:py-11">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-6 text-center md:mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500/85">Catalog complet</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-zinc-50 md:text-2xl md:tracking-tight">
                Toate categoriile
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-500/80 md:text-sm">
                Număr de anunțuri din catalog (live).
              </p>
            </div>

            <ul className="mx-auto grid max-w-7xl list-none grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
              {ALL_CATEGORIES.map((categoryName, index) => {
                const meta = HOME_CATEGORY_CARD_META[categoryName] ?? {
                  icon: "other" as const,
                  sub: "Anunțuri în această categorie.",
                };
                const isPopular = popularCategories.has(categoryName);
                const count = categoryCounts[categoryName] ?? 0;
                const imagePriority = index < 10;

                const pillarSlug = primarySlugForCategoryLabel(categoryName);
                const categoryHref =
                  pillarSlug !== null ? `/${pillarSlug}` : `/listings?category=${encodeURIComponent(categoryName)}`;

                const photo = CATEGORY_STOCK_PHOTO[meta.icon];

                return (
                  <li key={categoryName} className="min-w-0 [perspective:1200px]">
                    <Link
                      href={categoryHref}
                      prefetch={false}
                      className="home-category-grid-card group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.055] bg-gradient-to-b from-white/[0.035] to-[rgb(14,16,22)] motion-reduce:transition-none hover:-translate-y-px hover:border-white/[0.085] motion-reduce:hover:translate-y-0"
                    >
                      <div
                        className="home-category-photo-cover relative aspect-[5/3] min-h-[9.75rem] w-full shrink-0 overflow-hidden bg-[#252a35] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] sm:min-h-[10.75rem]"
                        style={{ backgroundImage: `url('${photo.src}')` }}
                      >
                        <HomeCategoryStockImage
                          src={photo.src}
                          alt={photo.alt}
                          iconKey={meta.icon}
                          sizes="(max-width: 768px) 46vw, 380px"
                          catalogLook={false}
                          priority={imagePriority}
                          imageClassName="z-[1] object-cover object-center transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.035] motion-reduce:group-hover:scale-100 group-hover:brightness-[1.02]"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-[#0a0b0e]/40 via-transparent to-transparent"
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[55%] bg-gradient-to-t from-[#08090d]/95 via-[#08090d]/35 to-transparent"
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,0.07)_0%,transparent_50%)] opacity-80"
                          aria-hidden
                        />
                        {isPopular ? (
                          <span className="absolute left-2.5 top-2.5 z-[3] rounded-full border border-white/[0.1] bg-black/35 px-2 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.16em] text-zinc-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md sm:left-3 sm:top-3 sm:text-[7px]">
                            Popular
                          </span>
                        ) : null}
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5 sm:pt-3.5">
                        <h3 className="line-clamp-2 min-h-[2.5rem] text-left text-[13px] font-semibold leading-[1.25] tracking-[-0.02em] text-zinc-50 sm:min-h-[2.65rem] sm:text-[0.9375rem] sm:leading-snug">
                          {categoryName}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-left text-[10.5px] leading-[1.45] text-zinc-500/75 sm:text-[11px] sm:leading-relaxed">
                          {meta.sub}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1 sm:gap-1.5">
                          {(CATEGORY_PREVIEW_TAGS[categoryName] ?? [meta.icon, "Marketplace", "Live"]).slice(0, 3).map((tag) => (
                            <span
                              key={`${categoryName}-${tag}`}
                              className="rounded-full border border-white/[0.07] bg-white/[0.05] px-1.5 py-px text-[7px] font-medium uppercase tracking-[0.1em] text-zinc-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:px-2 sm:py-0.5 sm:text-[8px] sm:tracking-[0.08em]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.055] pt-3 sm:pt-3.5">
                          <span className="min-w-0 truncate text-[10.5px] font-medium tabular-nums tracking-tight text-zinc-500/70 sm:text-[11px]">
                            {categoryCountsError ? "—" : `${formatRoInteger(count)} anunțuri`}
                          </span>
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-xs text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-white/[0.12] group-hover:bg-white/[0.07] group-hover:text-white motion-reduce:transition-none"
                            aria-hidden
                          >
                            →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <HomeDiscoverShelf variant="premium" />

        <section
          className="border-t border-white/[0.06] bg-[#12151a] py-8 md:py-10"
          aria-labelledby="pro-partners-heading"
        >
          <div className="mx-auto max-w-7xl px-4">
            <div className="rounded-lg border border-white/[0.08] bg-[#181b22] p-5 shadow-sm md:p-7">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Business</p>
                  <h2 id="pro-partners-heading" className="mt-1 text-lg font-semibold text-zinc-50 md:text-xl">
                    Dealeri și magazine online
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[13px] text-zinc-400 md:text-sm">
                    Vizibilitate pentru stocuri mari — aceeași experiență pentru cumpărători.
                  </p>
                </div>
                <Link
                  href="/business"
                  className="inline-flex items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/[0.18] hover:bg-white/[0.07]"
                >
                  Soluții pentru firme →
                </Link>
              </div>
              <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
                {[
                  {
                    t: "Moderare",
                    d: "Flux clar pentru publicare și sesizări.",
                  },
                  {
                    t: "Promovări",
                    d: "Opțiuni când ai nevoie de mai mult trafic.",
                  },
                  {
                    t: "Suport",
                    d: "Contact operațional și facturare.",
                  },
                ].map((x) => (
                  <li key={x.t} className="rounded-md border border-white/[0.08] bg-[#141820] p-3.5">
                    <h3 className="text-sm font-semibold text-zinc-100">{x.t}</h3>
                    <p className="mt-1.5 text-[13px] leading-snug text-zinc-500">{x.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="border-t border-white/[0.06] bg-[#0f1116]">
          <StatsStripSafe />
        </div>

        <section className="mx-auto max-w-7xl px-4 py-10 md:py-12">
          <h2 className="text-lg font-semibold text-zinc-50 md:text-xl">Siguranță la cumpărături</h2>
          <p className="mt-1.5 max-w-2xl text-[13px] text-zinc-400 md:text-sm">
            Mesaje în platformă, fără plăți în avans către necunoscuți; raportează anunțuri dubioase.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <Card
              variant="elevated"
              padding="none"
              className="border border-white/[0.08] bg-[#181b22] p-4 shadow-sm"
            >
              <Card.Body>
                <h3 className="mb-1.5 text-[14px] font-semibold text-zinc-100">Anunțuri verificate</h3>
                <p className="text-[13px] leading-snug text-zinc-500">
                  Moderăm conținutul pentru a reduce spam-ul și escrocheriile evidente.
                </p>
              </Card.Body>
            </Card>

            <Card
              variant="elevated"
              padding="none"
              className="border border-white/[0.08] bg-[#181b22] p-4 shadow-sm"
            >
              <Card.Body>
                <h3 className="mb-1.5 text-[14px] font-semibold text-zinc-100">Raportează</h3>
                <p className="text-[13px] leading-snug text-zinc-500">
                  Ceva nu se potrivește? Scrie-ne — verificăm.
                </p>
                <Link
                  href="/contact"
                  className="mt-2 inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 hover:underline"
                >
                  Contact →
                </Link>
              </Card.Body>
            </Card>

            <Card
              variant="elevated"
              padding="none"
              className="border border-white/[0.08] bg-[#181b22] p-4 shadow-sm"
            >
              <Card.Body>
                <h3 className="mb-1.5 text-[14px] font-semibold text-zinc-100">Contact în platformă</h3>
                <p className="text-[13px] leading-snug text-zinc-500">
                  Păstrează conversația în canalul ClickAnunț.
                </p>
              </Card.Body>
            </Card>
          </div>
        </section>

        {editorialStrip}
      </main>
    </>
  );
}
