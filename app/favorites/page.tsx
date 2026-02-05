"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function FavoritesPage() {
  const [favorites] = useState([
    {
      id: 1,
      title: "BMW Seria 3 320d xDrive",
      price: "75.000 RON",
      location: "București, Sector 1",
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop",
      category: "Auto",
      views: 2345,
      featured: true,
      specs: "2020 · 45.000 km · Diesel · Automat",
    },
    {
      id: 2,
      title: "Apartament 2 camere decomandat",
      price: "95.000 EUR",
      location: "Cluj-Napoca, Mănăștur",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
      category: "Imobiliare",
      views: 1892,
      featured: true,
      specs: "56 mp · Etaj 3 · 2025 · Parcare",
    },
    {
      id: 3,
      title: "iPhone 14 Pro Max 256GB",
      price: "4.500 RON",
      location: "Timișoara, Centru",
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
      category: "Electronice",
      views: 3156,
      featured: false,
      specs: "Deep Purple · Garantie · Impecabil",
    },
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-white">Anunțurile mele </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              favorite
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Aici găsești toate anunțurile salvate pentru mai târziu
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{favorites.length}</div>
                <div className="text-sm text-gray-400 font-medium">Favorite totale</div>
              </div>
            </div>
          </div>

          <div className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div>
                <div className="text-3xl font-black text-white">
                  {favorites.reduce((sum, f) => sum + f.views, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400 font-medium">Vizualizări totale</div>
              </div>
            </div>
          </div>

          <div className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#39FF14] to-[#00FF00] rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black text-white">
                  {favorites.filter((f) => f.featured).length}
                </div>
                <div className="text-sm text-gray-400 font-medium">Anunțuri premium</div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div className="text-center py-20">
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
            <h3 className="text-2xl font-black text-white mb-3">Niciun anunț favorit</h3>
            <p className="text-gray-400 text-lg mb-8">
              Salvează anunțurile care te interesează pentru a le accesa rapid
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
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
            {favorites.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="card-3d group cursor-pointer relative overflow-hidden rounded-2xl border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all duration-500"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF7900]/40 via-transparent to-[#B537F2]/40 mix-blend-color" />

                  {/* Remove from favorites button */}
                  <button className="absolute top-4 right-4 w-12 h-12 bg-[#FF7900] hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg z-10">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {listing.featured && (
                    <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-[#FFB84D] via-[#FF7900] to-[#E66D00] text-white text-xs font-black rounded-full shadow-[0_0_20px_rgba(255,121,0,0.8)] animate-pulse">
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
                    <span className="px-3 py-1 bg-[#FF7900]/20 text-[#FF7900] text-xs font-black rounded-full border border-[#FF7900]/30">
                      {listing.category}
                    </span>
                  </div>

                  <h3 className="font-black text-xl text-white mb-3 group-hover:text-[#FF7900] transition line-clamp-2 leading-tight">
                    {listing.title}
                  </h3>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-1 font-medium">
                    {listing.specs}
                  </p>

                  <div className="mb-4">
                    <div className="text-3xl font-black bg-gradient-to-r from-[#FF7900] to-[#FFB84D] bg-clip-text text-transparent">
                      {listing.price}
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
                    <span className="font-semibold">{listing.location}</span>
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
                    <button className="flex-1 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white py-3 px-4 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,121,0,0.5)]">
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
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
