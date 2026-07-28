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
const HOME_CAT = "Imobiliare";
const MIN_SHELF_ITEMS = 3;
const SHELF_TAKE = 8;

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
  viewAllHref: string;
};

type LoadedShelf = ShelfConfig & { items: Row[] };

async function fetchShelfRows(config: Pick<ShelfConfig, "sort" | "category">): Promise<Row[]> {
  const params = new URLSearchParams({
    status: "active",
    limit: "20",
    sort: config.sort,
  });
  if (config.category) params.set("category", config.category);
  const res = await fetch(`/api/listings?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch");
  const json = (await res.json()) as { data?: Row[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  return filterListingsWithReachablePrimaryPhoto(rows, SHELF_TAKE + 4);
}

function takeUnique(rows: Row[], seen: Set<string>, limit: number): Row[] {
  const out: Row[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

const BASE_SHELVES: ShelfConfig[] = [
  {
    title: "Anunțuri recente",
    subtitle: "Ultimele publicări verificate, cu fotografie.",
    sort: "newest",
    viewAllHref: "/listings?sort=newest",
  },
  {
    title: "Anunțuri promovate",
    subtitle: "Anunțuri cu vizibilitate ridicată în catalog.",
    sort: "featured",
    viewAllHref: "/listings?sort=featured",
  },
];

const CATEGORY_CANDIDATES: ShelfConfig[] = [
  {
    title: "Auto",
    subtitle: "Vehicule recente din categoria auto.",
    sort: "featured",
    category: AUTO_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(AUTO_CAT)}&sort=featured`,
  },
  {
    title: "Imobiliare",
    subtitle: "Locuințe și proprietăți cu inventar activ.",
    sort: "newest",
    category: HOME_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(HOME_CAT)}&sort=newest`,
  },
  {
    title: "Electronice",
    subtitle: "Telefoane, laptopuri și electrocasnice.",
    sort: "featured",
    category: ELEC_CAT,
    viewAllHref: `/listings?category=${encodeURIComponent(ELEC_CAT)}&sort=featured`,
  },
];

function ShelfRail({
  shelf,
  premium = false,
}: {
  shelf: LoadedShelf;
  premium?: boolean;
}) {
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
            {shelf.title}
          </h2>
          <p className={`mt-0.5 max-w-3xl text-sm ${premium ? "text-zinc-400" : "text-slate-600"}`}>
            {shelf.subtitle}
          </p>
        </div>
        <Link
          href={shelf.viewAllHref}
          className={
            premium
              ? "text-sm font-semibold text-orange-400/95 transition hover:text-orange-300 hover:underline"
              : "text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          }
        >
          Vezi tot →
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 md:gap-5">
        {shelf.items.map((l, i) => (
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
    </div>
  );
}

/** Homepage listing rails — max 3 shelves with global listing dedupe. */
export function HomeDiscoverShelf({ variant = "light" }: { variant?: "light" | "premium" }) {
  const premium = variant === "premium";
  const [shelves, setShelves] = useState<LoadedShelf[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = new Set<string>();
        const next: LoadedShelf[] = [];

        for (const config of BASE_SHELVES) {
          const rows = await fetchShelfRows(config);
          const items = takeUnique(rows, seen, SHELF_TAKE);
          if (items.length >= MIN_SHELF_ITEMS) {
            next.push({ ...config, items });
          }
        }

        for (const config of CATEGORY_CANDIDATES) {
          if (next.length >= 3) break;
          const rows = await fetchShelfRows(config);
          const items = takeUnique(rows, seen, SHELF_TAKE);
          if (items.length >= MIN_SHELF_ITEMS) {
            next.push({ ...config, items });
            break;
          }
        }

        if (!cancelled) setShelves(next.slice(0, 3));
      } catch {
        if (!cancelled) setShelves([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded && shelves.length === 0) return null;

  return (
    <section
      className={premium ? "border-t border-white/[0.06] bg-[#0f1116] py-8 md:py-10" : "bg-slate-50 py-10 md:py-14"}
      aria-labelledby="market-rails-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center md:mb-10">
          <p
            className={`text-[11px] font-medium uppercase tracking-wider ${premium ? "text-zinc-400" : "text-slate-500"}`}
          >
            Catalog live
          </p>
          <h2
            id="market-rails-heading"
            className={`mt-1.5 text-xl font-semibold tracking-tight md:text-2xl ${premium ? "text-zinc-50" : "text-slate-900"}`}
          >
            Descoperă anunțuri
          </h2>
          <p className={`mx-auto mt-1.5 max-w-2xl text-[13px] md:text-sm ${premium ? "text-zinc-400" : "text-slate-600"}`}>
            Doar anunțuri aprobate, cu poză validă și titlu curat — la fel ca în catalogul principal.
          </p>
        </div>
        <div className="space-y-8 md:space-y-10">
          {!loaded
            ? Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    premium
                      ? "rounded-2xl border border-white/[0.06] bg-[#141820]/90 p-4 md:p-5"
                      : "rounded-2xl border border-slate-200/90 bg-white p-4 md:p-5"
                  }
                >
                  <div className="mb-4 h-6 w-48 animate-pulse rounded bg-zinc-700/40" />
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div
                        key={j}
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
                </div>
              ))
            : shelves.map((s) => (
                <ShelfRail key={`${s.title}-${s.category ?? ""}`} shelf={s} premium={premium} />
              ))}
        </div>
      </div>
    </section>
  );
}
