"use client";

import { useEffect, useState } from "react";
import { ListingCard, type ListingCardListing } from "@/app/components/ListingCard";
import { filterListingsWithReachablePrimaryPhoto } from "@/lib/listing-photo-reachable";
import { listingExcludedFromHomeHeroPreview } from "@/lib/public-listing-feed";

type Row = {
  id: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  photos: string[];
  category: string;
  createdAt?: string;
};

const PREVIEW_GRID_CLASS =
  "grid min-h-[200px] grid-cols-2 gap-3.5 sm:min-h-[220px] sm:grid-cols-4 sm:gap-4 md:gap-5";

function mapPreviewRow(l: Row): ListingCardListing {
  return {
    id: l.id,
    title: l.title,
    priceAmount: l.priceAmount,
    priceCurrency: l.priceCurrency,
    category: l.category,
    photos: l.photos,
    createdAt: l.createdAt ?? new Date(0).toISOString(),
    status: "active",
    isPromoted: false,
    views: 0,
  };
}

/** Compact listing strip — filters e2e/sample fixtures; uses shared enterprise ListingCard. */
export function HomeAboveFoldPreviews({ variant = "light" }: { variant?: "light" | "premium" }) {
  const premium = variant === "premium";
  const [items, setItems] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          status: "active",
          limit: "24",
          sort: "newest",
        });
        const res = await fetch(`/api/listings?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch");
        const json = (await res.json()) as { data?: Row[] };
        const rows = Array.isArray(json.data) ? json.data : [];
        const candidates = rows.filter((r) => !listingExcludedFromHomeHeroPreview(r));
        const clean = await filterListingsWithReachablePrimaryPhoto(candidates, 4);
        if (!cancelled) setItems(clean);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded && items.length === 0) return null;

  const appearance = premium ? "ink" : "paper";

  return (
    <div className={premium ? "mx-auto w-full max-w-5xl text-center" : "mt-6 lg:mt-0"}>
      {!premium ? (
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Live acum</p>
      ) : null}
      {!loaded ? (
        <div className={`${PREVIEW_GRID_CLASS} ${premium ? "mx-auto max-w-5xl" : ""}`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-2xl border animate-pulse ${
                premium ? "border-white/[0.06] bg-[#12151c]" : "rounded-lg border-slate-200 bg-slate-100"
              }`}
            >
              <div className={`aspect-[5/3] ${premium ? "bg-zinc-800/50" : "bg-slate-200/80"}`} />
              <div className="space-y-2 p-2.5 sm:p-3">
                <div className={`h-3.5 w-[90%] rounded-full ${premium ? "bg-zinc-800/60" : "bg-slate-200"}`} />
                <div className={`h-3 w-2/5 rounded-full ${premium ? "bg-zinc-800/45" : "bg-slate-200/90"}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className={`${PREVIEW_GRID_CLASS} ${premium ? "mx-auto max-w-5xl" : ""}`}>
          {items.map((l) => (
            <li key={l.id} className="min-w-0">
              <ListingCard
                listing={mapPreviewRow(l)}
                showFavorite={false}
                appearance={appearance}
                compact
                showMetaRow={false}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
