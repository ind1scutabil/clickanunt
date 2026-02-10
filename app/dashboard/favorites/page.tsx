"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

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

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<SavedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/dashboard/favorites');
      return;
    }

    fetchFavorites();
  }, [router]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      setFavorites(Array.isArray(data) ? data : data.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove from favorites');
      }

      setMessage({ type: 'success', text: 'Anunț scos din favorite' });
      setFavorites(favorites.filter(f => f.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la ștergere' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF7900] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Se încarcă favorite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-2">
            <span className="text-white">Anunțurile </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              salvate
            </span>
          </h1>
          <p className="text-gray-400">Anunțurile care ți-au plăcut</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="glass-dark rounded-2xl border-2 border-[#2A2A2A] p-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Nu ai favorite încă</h3>
            <p className="text-gray-400 text-lg mb-8">
              Explorează anunțurile și adaugă la favorite anunțurile care ți-au plăcut
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explorează anunțuri
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((listing) => (
              <div
                key={listing.id}
                className="glass-dark rounded-2xl border-2 border-[#2A2A2A] overflow-hidden hover:border-[#FF7900] transition-all group"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-[#1A1A1A] overflow-hidden">
                  {listing.imageUrls?.[0] ? (
                    <img
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4 bg-[#FF7900] text-white px-4 py-2 rounded-lg font-black">
                    {listing.price} {listing.currency}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {listing.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Seller */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-[#1A1A1A] rounded-lg">
                    {listing.seller.avatar ? (
                      <img
                        src={listing.seller.avatar}
                        alt={listing.seller.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF7900] to-[#FFB84D] flex items-center justify-center text-xs font-bold">
                        {listing.seller.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{listing.seller.name}</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(listing.createdAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-2 bg-[#1A1A1A] rounded-lg">
                      <div className="text-lg font-bold text-[#FF7900]">{listing.views || 0}</div>
                      <div className="text-xs text-gray-400">Vizualizări</div>
                    </div>
                    <div className="text-center p-2 bg-[#1A1A1A] rounded-lg">
                      <div className="text-lg font-bold text-[#FF7900]">{listing.saves || 0}</div>
                      <div className="text-xs text-gray-400">Salvate</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FF7900] to-[#E66D00] text-white rounded-lg font-bold text-sm text-center hover:shadow-lg hover:shadow-[#FF7900]/50 transition"
                    >
                      Vizualizează
                    </Link>
                    <button
                      onClick={() => handleRemoveFavorite(listing.id)}
                      className="flex-1 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-bold text-sm hover:bg-red-500/10 transition"
                    >
                      Scoate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <Link href="/dashboard" className="text-[#FF7900] hover:text-[#FFB84D] font-bold mt-12 inline-block">
          ← Înapoi la dashboard
        </Link>
      </div>

      <Footer />
    </div>
  );
}
