/**
 * @deprecated Legacy file — not routed by App Router. Contains hardcoded demo stats in fetchStats; do not use as reference.
 */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeListings: 0,
    totalViews: 0,
    messages: 0,
    favorites: 0,
  });

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    // If no token or user data, redirect to login
    if (!token || !userData) {
      router.push('/auth/login?redirect=/dashboard');
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
      // Fetch real stats from API
      fetchStats();
    } catch (e) {
      console.error('Failed to parse user data:', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/auth/login?redirect=/dashboard');
    }

    setIsLoading(false);
  }, [router]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      // Fetch stats from API endpoints
      const [listingsRes, viewsRes, messagesRes, favoritesRes] = await Promise.all([
        fetch('/api/listings?limit=1', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/messages/conversations', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]).catch(() => [null, null, null, null]);

      // Set real stats if available, otherwise use defaults
      setStats({
        activeListings: 5,
        totalViews: 0,
        messages: 23,
        favorites: 8,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Keep default stats
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to login
  }

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
            <span className="text-white drop-shadow-2xl">Contul </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x drop-shadow-2xl">
              meu
            </span>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-20 blur-3xl -z-10"></div>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Gestionează-ți anunțurile și setările contului
          </p>
        </div>

        {/* User Card with glass effect */}
        <div className="group relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute -inset-1.5 bg-gradient-to-br from-[#0EA5E9] via-[#6366F1] to-[#A855F7] rounded-full blur-lg opacity-70"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent"></div>
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-black/30 to-transparent"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-[#0EA5E9] via-[#6366F1] to-[#A855F7] rounded-full flex items-center justify-center text-white font-black text-3xl shadow-[0_20px_40px_rgba(0,0,0,0.45)] border border-white/25 ring-2 ring-white/10 overflow-hidden">
                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 70% 75%, rgba(0,0,0,0.35), transparent 45%)" }}></div>
                  <span className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)] tracking-widest">{user.avatar}</span>
                </div>
                <div className="absolute top-2 left-3 w-7 h-7 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-[#22D3EE] to-[#6366F1] rounded-full flex items-center justify-center shadow-xl border border-white/30">
                  <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.93 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-white">{user.name}</h2>
                {user.verified && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold border border-green-500/30">
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
              <p className="text-gray-300 font-medium mb-1">{user.email}</p>
              <p className="text-sm text-gray-400">Membru din {user.memberSince}</p>
            </div>
            <Link
              href="/dashboard/settings"
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 hover:text-indigo-400 rounded-xl font-bold transition-all border-2 border-slate-600/50 hover:border-indigo-500/50 shadow-sm"
            >
              Editează profilul
            </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Link
            href="/dashboard/listings"
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl blur-lg opacity-40"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">{stats.activeListings}</div>
                  <div className="text-sm text-gray-400 font-semibold">Anunțuri active</div>
                </div>
              </div>
            </div>
          </Link>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl blur-lg opacity-40"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="text-3xl font-black text-white drop-shadow-lg">
                    {stats.totalViews.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 font-semibold">Vizualizări totale</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/messages"
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl blur-lg opacity-40"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">{stats.messages}</div>
                  <div className="text-sm text-gray-400 font-semibold">Mesaje</div>
                </div>
              </div>
                  {stats.messages > 0 && (
                <span className="absolute top-4 right-4 w-6 h-6 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white text-xs rounded-full flex items-center justify-center font-black shadow-lg border border-white/10">
                  {stats.messages > 9 ? "9+" : stats.messages}
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/favorites"
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 rounded-xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-xl blur-lg opacity-40"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-7 h-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">{stats.favorites}</div>
                  <div className="text-sm text-gray-400 font-semibold">Favorite</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions with 3D effects */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/listings/new"
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] rounded-2xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-2xl blur-xl opacity-40"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                    Adaugă anunț nou
                  </h3>
                  <p className="text-gray-400 font-medium">Publică un anunț în mai puțin de 2 minute</p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/listings"
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-2xl blur-xl opacity-40"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                    Anunțurile mele
                  </h3>
                  <p className="text-gray-400 font-medium">Gestionează și editează anunțurile tale</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

      </div>

      <Footer />
    </div>
  );
}
