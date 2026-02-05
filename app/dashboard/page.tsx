"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function DashboardPage() {
  const [user] = useState({
    name: "Ion Popescu",
    email: "ion.popescu@example.com",
    avatar: "IP",
    memberSince: "2025",
    verified: true,
  });

  const [stats] = useState({
    activeListings: 5,
    totalViews: 12453,
    messages: 23,
    favorites: 8,
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-white">Contul </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              meu
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Gestionează-ți anunțurile și setările contului
          </p>
        </div>

        {/* User Card */}
        <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-full flex items-center justify-center text-white font-black text-3xl">
              {user.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-white">{user.name}</h2>
                {user.verified && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-[#39FF14]/20 text-[#39FF14] rounded-full text-sm font-bold border border-[#39FF14]/30">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verificat
                  </div>
                )}
              </div>
              <p className="text-gray-400 font-medium mb-1">{user.email}</p>
              <p className="text-sm text-gray-500">Membru din {user.memberSince}</p>
            </div>
            <Link
              href="/dashboard/settings"
              className="px-6 py-3 glass-dark hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-[#2A2A2A]"
            >
              Editează profilul
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Link
            href="/dashboard/listings"
            className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{stats.activeListings}</div>
                <div className="text-sm text-gray-400 font-medium">Anunțuri active</div>
              </div>
            </div>
          </Link>

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
                  {stats.totalViews.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400 font-medium">Vizualizări totale</div>
              </div>
            </div>
          </div>

          <Link
            href="/messages"
            className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all group relative"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#B537F2] to-[#7B2BF9] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{stats.messages}</div>
                <div className="text-sm text-gray-400 font-medium">Mesaje</div>
              </div>
            </div>
            {stats.messages > 0 && (
              <span className="absolute top-4 right-4 w-6 h-6 bg-[#FF7900] text-white text-xs rounded-full flex items-center justify-center font-black">
                {stats.messages > 9 ? "9+" : stats.messages}
              </span>
            )}
          </Link>

          <Link
            href="/favorites"
            className="glass-dark rounded-xl p-6 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#39FF14] to-[#00FF00] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{stats.favorites}</div>
                <div className="text-sm text-gray-400 font-medium">Favorite</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/listings/new"
            className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#FF7900] transition">
                  Adaugă anunț nou
                </h3>
                <p className="text-gray-400">Publică un anunț în mai puțin de 2 minute</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/listings"
            className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] hover:border-[#1E90FF] transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#1E90FF] transition">
                  Anunțurile mele
                </h3>
                <p className="text-gray-400">Gestionează și editează anunțurile tale</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
