"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState, useEffect } from "react";

interface Favorite {
  id: string;
  listing: {
    id: string;
    title: string;
    priceAmount: number;
    priceCurrency: string;
    photos: string[];
    city: string | null;
    county: string | null;
    category: string;
    subcategory: string | null;
    views: number;
    isFeatured: boolean;
    condition: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
    fuel: string | null;
    transmission: string | null;
    status: string;
    createdAt: string;
  };
  createdAt: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error('Failed to fetch favorites');
      
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (err: any) {
      console.error('Error fetching favorites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

      const res = await fetch(`/api/favorites?listingId=${listingId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
      });

      if (!res.ok) throw new Error('Failed to remove favorite');

      // Remove from local state
      setFavorites(prev => prev.filter(fav => fav.listing.id !== listingId));
    } catch (err: any) {
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
    <div className="min-h-screen bg-[#0A0B14] relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Header with 3D effect */}
        <div className="mb-12">
          <h1 className="text-6xl font-black mb-4 relative">
            <span className="text-white drop-shadow-2xl">Anunțurile mele </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x drop-shadow-2xl">
              favorite
            </span>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-20 blur-3xl -z-10"></div>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Aici găsești toate anunțurile salvate pentru mai târziu
          </p>
        </div>

        {/* Stats with 3D cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-orange-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-2xl">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-white drop-shadow-lg">{favorites.length}</div>
                  <div className="text-sm text-gray-400 font-semibold">Favorite totale</div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-2xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-white drop-shadow-lg">
                    {favorites.reduce((sum, f) => sum + f.listing.views, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 font-semibold">Vizualizări totale</div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-2xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-white drop-shadow-lg">
                    {favorites.filter((f) => f.listing.isFeatured).length}
                  </div>
                  <div className="text-sm text-gray-400 font-semibold">Anunțuri premium</div>
                </div>
              </div>
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
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Niciun anunț favorit</h3>
            <p className="text-gray-400 text-lg mb-8">
              Salvează anunțurile care te interesează pentru a le accesa rapid
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6366F1] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Explorează anunțuri
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const listing = favorite.listing;
              const image = listing.photos[0] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop';
              
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

      <Footer />
    </div>
  );
}
