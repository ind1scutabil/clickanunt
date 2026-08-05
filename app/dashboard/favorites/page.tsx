"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import {
  fetchWithAuthRefresh,
  jsonMutationWithAuthRefresh,
  validateServerAuthSession,
  clearStaleBrowserAuth,
} from "@/lib/admin-fetch";

interface SavedListing {
  id: string;
  title: string;
  price: string;
  currency: string;
  description: string;
  imageUrls: string[];
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  views: number;
  saves: number;
  createdAt: string;
}

/** Token-uri vizuale — doar această pagină. */
const pageAmbient =
  "pointer-events-none absolute inset-0 overflow-hidden";
const ctaPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-11 sm:px-6";
const panelSurface =
  "relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045]";
const listingCardSurface =
  "group relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/95 shadow-md shadow-black/30 ring-1 ring-white/[0.04] transition-all duration-300 hover:border-orange-500/25 hover:shadow-[0_0_32px_-12px_rgba(249,115,22,0.12)]";

export default function FavoritesPage() {
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);
  const [favorites, setFavorites] = useState<SavedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;

    const init = async () => {
      const session = await validateServerAuthSession();
      if (!session.ok) {
        if (!session.transient) {
          clearStaleBrowserAuth();
          router.push("/auth/login?redirect=/dashboard/favorites");
        }
        return;
      }
      void fetchFavorites();
    };

    void init();
  }, [clientReady, router]);

  const fetchFavorites = async () => {
    try {
      const response = await fetchWithAuthRefresh("/api/favorites", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearStaleBrowserAuth();
          router.push("/auth/login?redirect=/dashboard/favorites");
          return;
        }
        throw new Error("Failed to fetch favorites");
      }

      const data = await response.json();
      setFavorites(Array.isArray(data) ? data : data.favorites || []);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      const res = await jsonMutationWithAuthRefresh(
        `/api/favorites?listingId=${encodeURIComponent(id)}`,
        "DELETE"
      );

      if (!res.ok) {
        throw new Error("Failed to remove from favorites");
      }

      setMessage({ type: "success", text: "Anunț scos din favorite" });
      setFavorites(favorites.filter((f) => f.id !== id));
    } catch (err) {
      setMessage({ type: "error", text: "Eroare la ștergere" });
    }
  };

  if (!clientReady || isLoading) {
    return (
      <div
        data-dashboard-surface="favorites-dashboard-v1"
        className="relative min-h-screen bg-[#030304] text-zinc-100 antialiased selection:bg-orange-500/30"
        suppressHydrationWarning
      >
        <div className={pageAmbient}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.09),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_36%_at_100%_0%,rgba(139,92,246,0.06),transparent_50%)]" />
        </div>
        <Navbar />
        <main className="relative z-10 mx-auto flex max-w-6xl flex-1 items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className={`w-full max-w-md py-16 text-center ${panelSurface}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            <div
              className="relative mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-orange-500 shadow-lg shadow-orange-950/20"
              aria-hidden
            />
            <p className="relative mt-4 text-sm font-medium tracking-tight text-zinc-500">Se încarcă favorite…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      data-dashboard-surface="favorites-dashboard-v1"
      className="relative min-h-screen bg-[#030304] text-zinc-100 antialiased selection:bg-orange-500/30"
      suppressHydrationWarning
    >
      <div className={pageAmbient}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.09),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_36%_at_100%_0%,rgba(139,92,246,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_38%_32%_at_0%_100%,rgba(59,130,246,0.04),transparent_48%)]" />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div
          className="mb-7 h-px w-full bg-gradient-to-r from-transparent via-orange-500/35 to-transparent md:mb-8"
          aria-hidden
        />

        <header className="mb-8 md:mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Colecția ta</p>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Anunțurile{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              salvate
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">Anunțurile care ți-au plăcut</p>
        </header>

        {message && (
          <div
            className={`relative mb-6 overflow-hidden rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              message.type === "success"
                ? "border-emerald-500/35 bg-gradient-to-r from-emerald-950/50 to-emerald-950/20 text-emerald-100 ring-emerald-500/15"
                : "border-red-500/35 bg-gradient-to-r from-red-950/50 to-red-950/20 text-red-100 ring-red-500/10"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className={`px-6 py-16 text-center sm:px-10 sm:py-20 ${panelSurface}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
            <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/70 bg-gradient-to-br from-orange-950/50 to-zinc-950 text-orange-300/95 shadow-inner">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="relative text-base font-semibold tracking-tight text-white sm:text-lg">Nu ai favorite încă</h3>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
              Explorează anunțurile și adaugă la favorite anunțurile care ți-au plăcut
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href="/listings" className={ctaPrimary}>
                <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorează anunțuri
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((listing) => (
              <div key={listing.id} className={listingCardSurface}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative w-full overflow-hidden bg-zinc-950 aspect-video">
                  <img
                    src={listingPrimaryPhotoSrc(listing.imageUrls)}
                    alt={listing.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.onerror = null;
                      el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                    }}
                  />

                  <div className="absolute right-4 top-4 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                    {listing.price} {listing.currency}
                  </div>
                </div>

                <div className="relative border-t border-zinc-800/80 p-6">
                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold tracking-tight text-zinc-100">{listing.title}</h3>

                  <p className="mb-4 line-clamp-2 text-sm text-zinc-500">{listing.description}</p>

                  <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3">
                    {listing.seller.avatar ? (
                      <img
                        src={listing.seller.avatar}
                        alt={listing.seller.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-xs font-bold text-white">
                        {listing.seller.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">{listing.seller.name}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(listing.createdAt).toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 py-2 text-center">
                      <div className="text-lg font-semibold tabular-nums text-orange-400">{listing.views || 0}</div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Vizualizări</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 py-2 text-center">
                      <div className="text-lg font-semibold tabular-nums text-orange-400">{listing.saves || 0}</div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Salvate</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-amber-500"
                    >
                      Vizualizează
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(listing.id)}
                      className="flex flex-1 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/50"
                    >
                      Scoate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/dashboard"
          className="mt-12 inline-flex text-sm font-semibold text-orange-400 transition hover:text-amber-300"
        >
          ← Înapoi la dashboard
        </Link>
      </main>

      <Footer />
    </div>
  );
}
