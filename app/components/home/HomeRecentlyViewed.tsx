"use client";

import { useEffect, useState } from "react";
import { isListingPrimaryPhotoReachable } from "@/lib/listing-photo-reachable";
import { readRecentListingSnapshots, type RecentListingSnapshot } from "@/lib/recent-listings-storage";
import { ListingCard, type ListingCardListing } from "@/app/components/ListingCard";

function mapSnapshot(l: RecentListingSnapshot): ListingCardListing {
  return {
    id: l.id,
    title: l.title,
    priceAmount: l.priceAmount,
    priceCurrency: l.priceCurrency,
    category: l.category ?? "Anunț",
    photos: l.photo ? [l.photo] : [],
    createdAt: new Date(l.viewedAt).toISOString(),
    status: "active",
    isPromoted: false,
    views: 0,
  };
}

export function HomeRecentlyViewed({ variant = "light" }: { variant?: "light" | "premium" }) {
  const premium = variant === "premium";
  const [items, setItems] = useState<RecentListingSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snapshots = readRecentListingSnapshots();
      const reachable: RecentListingSnapshot[] = [];
      for (const row of snapshots) {
        if (reachable.length >= 8) break;
        const photos = row.photo ? [row.photo] : [];
        if (photos.length === 0) continue;
        if (await isListingPrimaryPhotoReachable(photos)) {
          reachable.push(row);
        }
      }
      if (!cancelled) setItems(reachable);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  const appearance = premium ? "ink" : "paper";

  return (
    <section
      className={
        premium
          ? "border-t border-white/10 bg-[#121214] py-8 md:py-10"
          : "border-t border-slate-200 bg-white py-8 md:py-10"
      }
      aria-labelledby="recent-viewed-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="recent-viewed-heading"
              className={`text-lg font-semibold md:text-xl ${premium ? "text-white" : "text-slate-900"}`}
            >
              Vizualizate recent
            </h2>
            <p className={`text-sm ${premium ? "text-zinc-400" : "text-slate-500"}`}>
              Îți amintim unde ai fost în această sesiune.
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8 lg:gap-4">
          {items.map((l) => (
            <li key={l.id} className="min-w-0">
              <ListingCard
                listing={mapSnapshot(l)}
                showFavorite
                appearance={appearance}
                compact
                showMetaRow={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
