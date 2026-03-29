"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { useState, useEffect } from "react";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import type { FavoriteWithListingDto } from "@clickanunt/api-contracts";

type Favorite = FavoriteWithListingDto;

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/favorites');
      return;
    }
    fetchFavorites();
  }, [router]);

  const fetchFavorites = async () => {
    try {
      setError('');
      const res = await fetchWithAuthRefresh('/api/favorites', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login?redirect=/favorites');
          return;
        }
        let detail = 'Nu am putut încărca favoritele.';
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
      console.error('Error fetching favorites:', err);
      setError('Nu am putut încărca favoritele. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetchWithAuthRefresh(
        `/api/favorites?listingId=${encodeURIComponent(listingId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login?redirect=/favorites');
        }
        return;
      }

      setFavorites((prev) => prev.filter((fav) => fav.listing.id !== listingId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const formatLocation = (city: string | null, county: string | null) => {
    if (city && county) return `${city}, ${county}`;
    if (city) return city;
    if (county) return county;
    return 'Locație nedisponibilă';
  };

  const formatSpecs = (listing: Favorite['listing']) => {
    const specs = [];
    if (listing.year) specs.push(listing.year.toString());
    if (listing.mileage) specs.push(`${listing.mileage.toLocaleString()} km`);
    if (listing.fuel) specs.push(listing.fuel);
    if (listing.transmission) specs.push(listing.transmission);
    return specs.join(' · ') || 'Detalii nedisponibile';
  };

  return (
    <div className="enterprise-page-bg enterprise-mesh relative min-h-screen overflow-hidden">
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:pb-16 md:pt-12">
        <header className="mb-10 md:mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Salvate pentru tine
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Anunțurile mele{" "}
            <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              favorite
            </span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Acces rapid la anunțurile pe care le-ai salvat
          </p>
        </header>

        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <div className="enterprise-card enterprise-card-hover flex items-center gap-4 rounded-2xl p-5 md:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 ring-1 ring-rose-500/25">
              <svg className="h-6 w-6 text-rose-300" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-white md:text-3xl">{favorites.length}</div>
              <div className="text-sm font-medium text-[var(--text-tertiary)]">Favorite totale</div>
            </div>
          </div>

          <div className="enterprise-card enterprise-card-hover flex items-center gap-4 rounded-2xl p-5 md:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-500/25">
              <svg className="h-6 w-6 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-white md:text-3xl">
                {favorites.reduce((sum, f) => sum + f.listing.views, 0).toLocaleString()}
              </div>
              <div className="text-sm font-medium text-[var(--text-tertiary)]">Vizualizări totale</div>
            </div>
          </div>

          <div className="enterprise-card enterprise-card-hover flex items-center gap-4 rounded-2xl p-5 md:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <svg className="h-6 w-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-white md:text-3xl">
                {favorites.filter((f) => f.listing.isFeatured).length}
              </div>
              <div className="text-sm font-medium text-[var(--text-tertiary)]">Anunțuri evidențiate</div>
            </div>
          </div>
        </div>

        {/* Favorites List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Se încarcă favorite...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="enterprise-card rounded-3xl p-12 text-center md:p-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/20 ring-1 ring-white/10">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white md:text-2xl">Niciun anunț favorit</h3>
            <p className="mx-auto mb-8 max-w-md text-[var(--text-secondary)]">
              Salvează anunțurile care te interesează pentru acces rapid ulterior.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-8 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Către anunțuri
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const listing = favorite.listing;
              const image = listingPrimaryPhotoSrc(listing.photos);

              return (
              <Link
                key={favorite.id}
                href={`/listings/${listing.id}`}
                className="card-3d group cursor-pointer relative overflow-hidden rounded-2xl border-2 border-[#2A2A2A] hover:border-[#6366F1] transition-all duration-500"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={image}
                    alt={listing.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.onerror = null;
                      el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#6366F1]/40 via-transparent to-[#B537F2]/40 mix-blend-color" />

                  {/* Remove from favorites button */}
                  <button 
                    onClick={(e) => removeFavorite(listing.id, e)}
                    className="absolute top-4 right-4 w-12 h-12 bg-[#6366F1] hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg z-10">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {listing.isFeatured && (
                    <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#7C3AED] text-white text-xs font-black rounded-full shadow-[0_0_20px_rgba(255,121,0,0.8)] animate-pulse">
                      ⭐ TOP ANUNȚ
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 glass-dark text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-bold border border-white/10">
                    <svg className="w-5 h-5 text-[#1E90FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
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

                {/* Content */}
                <div className="glass-dark p-6 border-t border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-[#6366F1]/20 text-[#6366F1] text-xs font-black rounded-full border border-[#6366F1]/30">
                      {listing.category}
                    </span>
                  </div>

                  <h3 className="font-black text-xl text-white mb-3 group-hover:text-[#6366F1] transition line-clamp-2 leading-tight">
                    {listing.title}
                  </h3>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-1 font-medium">
                    {formatSpecs(listing)}
                  </p>

                  <div className="mb-4">
                    <div className="text-3xl font-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                      {formatPrice(listing.priceAmount, listing.priceCurrency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <svg
                      className="w-5 h-5 text-[#1E90FF]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
                    <span className="font-semibold">{formatLocation(listing.city, listing.county)}</span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-[#2A2A2A]">
                    <button className="flex-1 glass-dark hover:bg-gradient-to-r hover:from-[#1E90FF] hover:to-[#4DA6FF] text-white py-3 px-4 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-[#2A2A2A] hover:border-[#1E90FF]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      Sună
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6366F1] text-white py-3 px-4 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,121,0,0.5)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      Chat
                    </button>
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
