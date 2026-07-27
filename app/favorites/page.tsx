"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { useState, useEffect } from "react";
import { fetchWithAuthRefresh, jsonMutationWithAuthRefresh } from "@/lib/admin-fetch";
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import type { FavoriteWithListingDto } from "@clickanunt/api-contracts";
import { formatListingCommercialOrSalaryLine } from "@/lib/format-listing-price";

type Favorite = FavoriteWithListingDto & {
  available?: boolean;
  unavailableReason?: string | null;
};

/** Token-uri vizuale — doar această pagină. */
const pageAmbient =
  "pointer-events-none absolute inset-0 overflow-hidden";
const ctaPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-11 sm:px-6";
const panelSurface =
  "relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045]";
const favStatCard =
  "group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/95 p-4 shadow-md shadow-black/35 ring-1 ring-white/[0.04] transition-all duration-300 hover:border-orange-500/25 hover:shadow-[0_0_36px_-10px_rgba(249,115,22,0.12)] hover:ring-orange-500/15 md:gap-5 md:p-5";
const favIconWell =
  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:h-12 md:w-12";
const listingCardSurface =
  "group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/35 to-zinc-950/95 shadow-md shadow-black/30 ring-1 ring-white/[0.04] transition-all duration-300 hover:border-orange-500/25 hover:shadow-[0_0_32px_-12px_rgba(249,115,22,0.12)]";

export default function FavoritesPage() {
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/auth/login?redirect=/favorites");
      return;
    }
    void fetchFavorites();
  }, [clientReady, router]);

  const fetchFavorites = async () => {
    try {
      setError("");
      const res = await fetchWithAuthRefresh("/api/favorites", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/auth/login?redirect=/favorites");
          return;
        }
        let detail = "Nu am putut încărca favoritele.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = body.error;
        } catch {
          /* ignore */
        }
        setError(detail);
        return;
      }

      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (err: unknown) {
      console.error("Error fetching favorites:", err);
      setError("Nu am putut încărca favoritele. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await jsonMutationWithAuthRefresh(
        `/api/favorites?listingId=${encodeURIComponent(listingId)}`,
        "DELETE"
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/auth/login?redirect=/favorites");
        }
        return;
      }

      setFavorites((prev) => prev.filter((fav) => fav.listing.id !== listingId));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const formatLocation = (city: string | null, county: string | null) => {
    if (city && county) return `${city}, ${county}`;
    if (city) return city;
    if (county) return county;
    return "Locație nedisponibilă";
  };

  const formatSpecs = (listing: Favorite["listing"]) => {
    const specs = [];
    if (listing.year) specs.push(listing.year.toString());
    if (listing.mileage) specs.push(`${listing.mileage.toLocaleString()} km`);
    if (listing.fuel) specs.push(listing.fuel);
    if (listing.transmission) specs.push(listing.transmission);
    return specs.join(" · ") || "Detalii nedisponibile";
  };

  const totalViews = favorites.reduce((sum, f) => sum + f.listing.views, 0);
  const featuredCount = favorites.filter((f) => f.listing.isFeatured).length;

  return (
    <div
      data-dashboard-surface="favorites-v1"
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Salvate pentru tine
          </p>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Anunțurile mele{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              favorite
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
            Acces rapid la anunțurile pe care le-ai salvat
          </p>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <div className={favStatCard}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div
              className={`${favIconWell} border-rose-500/30 bg-gradient-to-br from-rose-950/50 to-zinc-950 text-rose-200 ring-1 ring-rose-500/20`}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="relative min-w-0">
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                {favorites.length}
              </div>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Favorite totale
              </p>
            </div>
          </div>

          <div className={favStatCard}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div
              className={`${favIconWell} border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-zinc-950 text-sky-200 ring-1 ring-sky-500/20`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div className="relative min-w-0">
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                {totalViews.toLocaleString()}
              </div>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Vizualizări totale
              </p>
            </div>
          </div>

          <div className={favStatCard}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div
              className={`${favIconWell} border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-zinc-950 text-emerald-200 ring-1 ring-emerald-500/20`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <div className="relative min-w-0">
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                {featuredCount}
              </div>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Anunțuri evidențiate
              </p>
            </div>
          </div>
        </div>

        {!clientReady || loading ? (
          <div className={`py-20 text-center sm:py-24 ${panelSurface}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            <div
              className="relative mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-orange-500 shadow-lg shadow-orange-950/20"
              aria-hidden
            />
            <p className="relative mt-4 text-sm font-medium tracking-tight text-zinc-500">
              Se încarcă favorite…
            </p>
          </div>
        ) : error ? (
          <div className="relative overflow-hidden rounded-xl border border-red-900/40 bg-gradient-to-b from-red-950/40 to-red-950/10 px-6 py-12 text-center shadow-lg ring-1 ring-red-500/10">
            <p className="text-sm font-medium text-red-100/95">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchFavorites();
              }}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-zinc-600/80 bg-zinc-950/80 px-5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/70"
            >
              Reîncearcă
            </button>
          </div>
        ) : favorites.length === 0 ? (
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
            <h3 className="relative text-base font-semibold tracking-tight text-white sm:text-lg">
              Niciun anunț favorit
            </h3>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
              Salvează anunțurile care te interesează pentru acces rapid ulterior.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href="/listings" className={ctaPrimary}>
                <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Către anunțuri
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => {
              const listing = favorite.listing;
              const image = listingPrimaryPhotoSrc(listing.photos);

              return (
                <Link
                  key={favorite.id}
                  href={`/listings/${listing.id}`}
                  className={listingCardSurface}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={image}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.onerror = null;
                        el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-orange-500/25 via-transparent to-amber-500/15 mix-blend-soft-light" />

                    <button
                      type="button"
                      onClick={(e) => removeFavorite(listing.id, e)}
                      className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 shadow-lg transition-all hover:bg-red-600"
                      aria-label="Elimină din favorite"
                    >
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {favorite.available === false ? (
                      <div className="absolute left-4 top-4 z-[1] rounded-full border border-amber-500/40 bg-amber-950/85 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-lg">
                        {favorite.unavailableReason === "expired"
                          ? "Expirat"
                          : favorite.unavailableReason === "deleted"
                            ? "Retras"
                            : "Indisponibil"}
                      </div>
                    ) : listing.isFeatured ? (
                      <div className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-900/40">
                        TOP ANUNȚ
                      </div>
                    ) : null}

                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/75 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                      <svg
                        className="h-5 w-5 text-orange-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {listing.views.toLocaleString()}
                    </div>
                  </div>

                  <div className="relative border-t border-zinc-800/80 bg-zinc-950/80 p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full border border-orange-500/25 bg-orange-950/45 px-3 py-1 text-xs font-semibold text-orange-200">
                        {listing.category}
                      </span>
                    </div>

                    <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-tight tracking-tight text-zinc-100 transition group-hover:text-orange-200">
                      {listing.title}
                    </h3>

                    <p className="mb-4 line-clamp-1 text-sm font-medium text-zinc-500">{formatSpecs(listing)}</p>

                    <div className="mb-4">
                      <div className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-3xl font-semibold tabular-nums tracking-tight text-transparent">
                        {(() => {
                          const line = formatListingCommercialOrSalaryLine({
                            category: listing.category,
                            priceType: (listing as { priceType?: string | null }).priceType,
                            priceAmount: listing.priceAmount,
                            priceCurrency: listing.priceCurrency,
                            salaryMin: (listing as { salaryMin?: number | null }).salaryMin,
                            salaryMax: (listing as { salaryMax?: number | null }).salaryMax,
                            salaryCurrency: (listing as { salaryCurrency?: string | null })
                              .salaryCurrency,
                            salaryPeriod: (listing as { salaryPeriod?: string | null })
                              .salaryPeriod,
                          });
                          return line.suffix
                            ? `${line.primary} · ${line.suffix}`
                            : line.primary;
                        })()}
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
                      <svg
                        className="h-5 w-5 shrink-0 text-orange-400/90"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="font-medium text-zinc-400">{formatLocation(listing.city, listing.county)}</span>
                    </div>

                    <div className="flex gap-2 border-t border-zinc-800/80 pt-4">
                      <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 py-3 text-sm font-semibold text-zinc-100 transition group-hover:border-zinc-600 group-hover:bg-zinc-800/80">
                        <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        Sună
                      </span>
                      <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-sm font-semibold text-white shadow-md shadow-orange-950/30 transition group-hover:from-orange-500 group-hover:to-amber-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        Chat
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
