"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListingCard, type ListingCardListing } from "@/app/components/ListingCard";
import { filterListingsWithReachablePrimaryPhoto } from "@/lib/listing-photo-reachable";

type Row = {
  id: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  photos: string[];
  category: string;
  isPromoted?: boolean;
  city?: string | null;
  county?: string | null;
  createdAt?: string;
  status?: string;
  views?: number;
  owner?: { id?: string; trustScore?: number };
};

const AUTO_CAT = "Auto, moto și ambarcațiuni";
const ELEC_CAT = "Electronice și electrocasnice";
const JOBS_CAT = "Locuri de muncă";
const HOME_CAT = "Imobiliare";

function mapShelfRowToCard(l: Row): ListingCardListing {
  return {
    id: l.id,
    title: l.title,
    priceAmount: l.priceAmount,
    priceCurrency: l.priceCurrency,
    category: l.category || "Anunț",
    photos: l.photos,
    createdAt: l.createdAt ?? new Date(0).toISOString(),
    status: l.status ?? "active",
    isPromoted: !!l.isPromoted,
    views: typeof l.views === "number" ? l.views : 0,
    city: l.city,
    county: l.county,
    owner:
      typeof l.owner?.trustScore === "number"
        ? {
            id: l.owner.id ?? "",
            trustScore: l.owner.trustScore,
            verificationLevel: "none" as const,
          }
        : undefined,
  };
}

type ShelfConfig = {
  title: string;
  subtitle: string;
  sort: "newest" | "featured";
  category?: string;
  city?: string;
  viewAllHref: string;
};

function Shelf({ config, premium = false }: { config: ShelfConfig; premium?: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          status: "active",
          limit: "20",
          sort: config.sort,
        });
        if (config.category) params.set("category", config.category);
        if (config.city) params.set("city", config.city);
        const res = await fetch(`/api/listings?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch");
        const json = (await res.json()) as { data?: Row[] };
        const rows = Array.isArray(json.data) ? json.data : [];
        const reachable = await filterListingsWithReachablePrimaryPhoto(rows, 8);
        if (!cancelled) {
          setItems(reachable);
          setErr(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setErr(true);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.sort, config.category, config.city]);

  if (err && items.length === 0 && loaded) return null;
  if (loaded && items.length === 0) return null;

  const appearance = premium ? "ink" : "paper";

  return (
    <div
      className={
        premium
          ? "rounded-2xl border border-white/[0.06] bg-[#141820]/90 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm md:p-5"
          : "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_8px_30px_-22px_rgba(15,23,42,0.12)] md:p-5"
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className={`text-lg font-semibold tracking-tight md:text-xl ${premium ? "text-white" : "text-slate-900"}`}
          >
            {config.title}
          </h2>
          <p className={`mt-0.5 max-w-3xl text-sm ${premium ? "text-zinc-400" : "text-slate-600"}`}>{config.subtitle}</p>
        </div>
        <Link
          href={config.viewAllHref}
          className={
            premium
              ? "text-sm font-semibold text-orange-400/95 transition hover:text-orange-300 hover:underline"
              : "text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          }
        >
          Vezi tot →
        </Link>
      </div>
      {!loaded ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-2xl border animate-pulse ${
                premium ? "border-white/[0.06] bg-[#12151c]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className={`aspect-[5/3] ${premium ? "bg-zinc-800/55" : "bg-slate-200/80"}`} />
              <div className="space-y-2 p-3">
                <div className={`h-3.5 w-[88%] rounded-full ${premium ? "bg-zinc-800/70" : "bg-slate-200"}`} />
                <div className={`h-3 w-[45%] rounded-full ${premium ? "bg-zinc-800/50" : "bg-slate-200/90"}`} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 md:gap-5">
          {items.map((l, i) => (
            <li key={l.id} className="h-full min-w-0">
              <ListingCard
                listing={mapShelfRowToCard(l)}
                showFavorite
                appearance={appearance}
                hotToday={i < 2 && !l.isPromoted}
                imagePriority={i < 2}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={
            premium
              ? "rounded-2xl border border-white/[0.08] bg-[#1a1d24]/80 p-4 md:p-5"
              : "rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5"
          }
        >
          <div className="mb-3 flex items-center justify-between">
            <p className={`text-sm font-semibold ${premium ? "text-white" : "text-slate-900"}`}>
              Se actualizează această secțiune
            </p>
            <Link
              href={config.viewAllHref}
              className={
                premium
                  ? "text-xs font-semibold text-orange-400 hover:underline"
                  : "text-xs font-semibold text-blue-600 hover:underline"
              }
            >
              Vezi anunțuri live →
            </Link>
          </div>
          <p className={`text-sm ${premium ? "text-zinc-400" : "text-slate-600"}`}>
            Între timp poți explora categoriile principale sau feed-ul complet din catalog.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { href: `/listings?category=${encodeURIComponent(AUTO_CAT)}`, label: "Auto" },
              { href: `/listings?category=${encodeURIComponent(HOME_CAT)}`, label: "Imobiliare" },
              { href: `/listings?category=${encodeURIComponent(ELEC_CAT)}`, label: "Electronice" },
              { href: "/listings?sort=featured", label: "Promovate" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className={
                  premium
                    ? "rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/22"
                    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
                }
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SHELVES: ShelfConfig[] = [
  {
    title: "Trending now",
    subtitle: "Anunțuri cu interes ridicat astăzi.",
    sort: "featured",
    viewAllHref: "/listings?sort=featured",
  },
  {
    title: "Recent listings",
    subtitle: "Ultimele publicări verificate, cu fotografie.",
    sort: "newest",
    viewAllHref: "/listings?sort=newest",
  },
  {
    title: "Luxury vehicles",
    subtitle: "Modele premium și oferte verificate.",
    sort: "featured",
    category: AUTO_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(AUTO_CAT)}&sort=featured`,
  },
  {
    title: "Recommended electronics",
    subtitle: "Telefoane, laptopuri și setup-uri moderne.",
    sort: "featured",
    category: ELEC_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(ELEC_CAT)}&sort=featured`,
  },
  {
    title: "New apartments",
    subtitle: "Locuințe recente, cu preț și localizare clare.",
    sort: "newest",
    category: HOME_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(HOME_CAT)}&sort=newest`,
  },
  {
    title: "Popular in Bucharest",
    subtitle: "Selectionate din cea mai activă zonă comercială.",
    sort: "featured",
    city: "București",
    viewAllHref: "/listings?city=Bucure%C8%99ti&sort=featured",
  },
  {
    title: "Premium dealers",
    subtitle: "Conturi dealer active, cu listing-uri promovate.",
    sort: "featured",
    viewAllHref: "/listings?sort=featured",
  },
  {
    title: "Recently added jobs",
    subtitle: "Oportunități noi de muncă în platformă.",
    sort: "newest",
    category: JOBS_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(JOBS_CAT)}`,
  },
  {
    title: "Featured listings",
    subtitle: "Anunțuri cu vizibilitate mare și conversie bună.",
    sort: "featured",
    viewAllHref: "/listings?sort=featured",
  },
  {
    title: "Promoted listings",
    subtitle: "Promovări active din multiple verticale.",
    sort: "newest",
    viewAllHref: "/listings?sort=newest",
  },
];

/** Homepage listing rails — client fetches `/api/listings` (same contract as production API). */
export function HomeDiscoverShelf({ variant = "light" }: { variant?: "light" | "premium" }) {
  const premium = variant === "premium";
  return (
    <section
      className={premium ? "border-t border-white/[0.06] bg-[#0f1116] py-8 md:py-10" : "bg-slate-50 py-10 md:py-14"}
      aria-labelledby="market-rails-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center md:mb-10">
          <p
            className={`text-[11px] font-medium uppercase tracking-wider ${premium ? "text-zinc-500" : "text-slate-500"}`}
          >
            Catalog live
          </p>
          <h2
            id="market-rails-heading"
            className={`mt-1.5 text-xl font-semibold tracking-tight md:text-2xl ${premium ? "text-zinc-50" : "text-slate-900"}`}
          >
            Descoperă anunțuri
          </h2>
          <p className={`mx-auto mt-1.5 max-w-2xl text-[13px] md:text-sm ${premium ? "text-zinc-500" : "text-slate-600"}`}>
            Doar anunțuri aprobate, cu poză validă și titlu curat — la fel ca în catalogul principal.
          </p>
        </div>
        <div className="space-y-8 md:space-y-10">
          {SHELVES.map((s) => (
            <Shelf key={`${s.title}-${s.category ?? ""}`} config={s} premium={premium} />
          ))}
        </div>
      </div>
    </section>
  );
}
