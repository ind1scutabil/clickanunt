"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function MyListingsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "expired">("active");

  const [listings] = useState([
    {
      id: 1,
      title: "BMW Seria 3 320d xDrive",
      price: "75.000 RON",
      status: "active",
      views: 2345,
      messages: 12,
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop",
      publishedAt: "5 zile în urmă",
      expiresIn: "25 zile",
    },
    {
      id: 2,
      title: "Apartament 2 camere decomandat",
      price: "95.000 EUR",
      status: "active",
      views: 1892,
      messages: 8,
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
      publishedAt: "3 zile în urmă",
      expiresIn: "27 zile",
    },
    {
      id: 3,
      title: "iPhone 14 Pro Max 256GB",
      price: "4.500 RON",
      status: "pending",
      views: 0,
      messages: 0,
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
      publishedAt: "În așteptare",
      expiresIn: "-",
    },
  ]);

  const filteredListings = listings.filter((listing) => listing.status === activeTab);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-5xl font-black mb-4">
              <span className="text-white">Anunțurile </span>
              <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
                mele
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Gestionează și editează anunțurile tale publicate
            </p>
          </div>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adaugă anunț nou
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "active"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Active
            <span className="ml-2 px-2 py-1 bg-[#39FF14]/20 text-[#39FF14] rounded-full text-xs border border-[#39FF14]/30">
              {listings.filter((l) => l.status === "active").length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "pending"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            În așteptare
            <span className="ml-2 px-2 py-1 bg-[#FFB84D]/20 text-[#FFB84D] rounded-full text-xs border border-[#FFB84D]/30">
              {listings.filter((l) => l.status === "pending").length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("expired")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "expired"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Expirate
            <span className="ml-2 px-2 py-1 bg-[#2A2A2A] rounded-full text-xs">
              {listings.filter((l) => l.status === "expired").length}
            </span>
          </button>
        </div>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">
              {activeTab === "active" && "Niciun anunț activ"}
              {activeTab === "pending" && "Niciun anunț în așteptare"}
              {activeTab === "expired" && "Niciun anunț expirat"}
            </h3>
            <p className="text-gray-400 text-lg mb-8">
              {activeTab === "active" && "Publică primul tău anunț și începe să vinzi"}
              {activeTab === "pending" && "Anunțurile în așteptare de aprobare vor apărea aici"}
              {activeTab === "expired" && "Anunțurile expirate vor apărea aici"}
            </p>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adaugă anunț nou
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="glass-dark rounded-2xl p-6 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  <div className="w-full md:w-64 h-48 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-white mb-2">{listing.title}</h3>
                        <div className="text-3xl font-black bg-gradient-to-r from-[#FF7900] to-[#FFB84D] bg-clip-text text-transparent">
                          {listing.price}
                        </div>
                      </div>
                      {listing.status === "active" && (
                        <span className="px-4 py-2 bg-[#39FF14]/20 text-[#39FF14] rounded-full text-sm font-bold border border-[#39FF14]/30">
                          Activ
                        </span>
                      )}
                      {listing.status === "pending" && (
                        <span className="px-4 py-2 bg-[#FFB84D]/20 text-[#FFB84D] rounded-full text-sm font-bold border border-[#FFB84D]/30">
                          În așteptare
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#1E90FF]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                        <span className="text-gray-400 font-medium">
                          {listing.views} vizualizări
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#B537F2]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <span className="text-gray-400 font-medium">{listing.messages} mesaje</span>
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        Publicat: {listing.publishedAt}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        Expiră în: {listing.expiresIn}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex items-center gap-2 px-5 py-2.5 glass-dark hover:bg-white/10 text-white rounded-lg font-bold text-sm transition-all border border-[#2A2A2A]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        Vizualizează
                      </Link>
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E90FF] to-[#4DA6FF] hover:from-[#4DA6FF] hover:to-[#1E90FF] text-white rounded-lg font-bold text-sm transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editează
                      </button>
                      <button className="flex items-center gap-2 px-5 py-2.5 glass-dark hover:bg-red-600/20 text-red-500 rounded-lg font-bold text-sm transition-all border border-red-500/30">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Șterge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
