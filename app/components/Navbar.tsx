"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ALL_CATEGORIES } from "@/lib/carData";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsLoggedIn(true);
      setUserEmail(user.email || null);
      setUserRole(user.role || 'user');
      setUserName(user.name || null);
      if (user.email === "owner@autoplatform.ro" || user.role === "admin") {
        setIsAdmin(true);
      }
    } else {
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserRole(null);
      setUserName(null);
    }
  }, []);

  const getAccountBadge = () => {
    if (!isLoggedIn) return 'DELOGAT';
    if (isAdmin || userRole === 'owner') return 'ADMIN';
    
    // Show initials or name for regular users
    if (userName) {
      const parts = userName.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return userName.substring(0, 2).toUpperCase();
    }
    
    // Fallback to email initials
    if (userEmail) {
      const emailParts = userEmail.split('@')[0].split('.');
      if (emailParts.length >= 2) {
        return (emailParts[0][0] + emailParts[emailParts.length - 1][0]).toUpperCase();
      }
      return userEmail.substring(0, 2).toUpperCase();
    }
    
    return 'U';
  };

  const accountBadge = getAccountBadge();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore network errors for logout
    } finally {
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserRole(null);
      setUserName(null);
      setIsAdmin(false);
      setIsUserMenuOpen(false);
      window.location.href = '/';
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const navElement = document.querySelector('header');
      
      // If click is outside nav element, close menus
      if (navElement && !navElement.contains(target)) {
        setIsCategoriesOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#6366F1] focus:text-white focus:px-6 focus:py-3 focus:rounded-xl focus:outline-none focus:ring-4 focus:ring-white/50 focus:shadow-2xl font-bold"
      >
        Salt la conținut principal
      </a>

      <header
        className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-[#6D5BFF]/20"
        role="banner"
      >
        <div className="bg-[#0B1220] hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex justify-between items-center text-sm text-white">
              <div className="flex items-center gap-6">
                <Link href="/about" className="flex items-center gap-2 hover:text-[#6D5BFF] transition font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Despre noi</span>
                </Link>
                <Link href="/contact" className="flex items-center gap-2 hover:text-[#6D5BFF] transition font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="hidden sm:inline">Asistență</span>
                </Link>
              </div>
              <div className="flex items-center gap-6">
                <a href="mailto:contact@clickanunt.ro" className="flex items-center gap-2 hover:text-[#6D5BFF] transition font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden lg:inline">contact@clickanunt.ro</span>
                </a>
                <a href="tel:+40784712496" className="flex items-center gap-2 hover:text-[#6D5BFF] transition font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="hidden lg:inline">+40 784 712 496</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <Link href="/" className="group flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-14 h-14 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-xl flex items-center justify-center text-3xl shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                📦
              </div>
              <div className="hidden sm:block">
                <div className="text-2xl font-black text-[#0B1220] leading-none">ClickAnunț</div>
                <div className="text-xs text-[#6D5BFF] font-bold uppercase tracking-wider -mt-0.5">Anunțuri gratuite</div>
              </div>
            </Link>

            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Ce cauți astăzi?"
                  aria-label="Caută anunțuri"
                  className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-[#6D5BFF] focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-[#6D5BFF]/30 outline-none transition-all text-gray-800 font-medium"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 mobile-orange-btn py-2 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                  aria-label="Caută"
                >
                  Caută
                </button>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  aria-label="Meniu categorii"
                  aria-expanded={isCategoriesOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 px-5 py-3 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition font-bold rounded-lg border-2 border-transparent hover:border-[#6D5BFF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Categorii
                  <svg className={`w-4 h-4 transition-transform ${isCategoriesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isCategoriesOpen && (
                  <div
                    className="absolute top-full left-0 mt-3 w-80 bg-white border-2 border-[#6D5BFF]/20 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50"
                    role="menu"
                    aria-label="Lista categorii"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <Link
                        key={cat}
                        href={`/listings?category=${encodeURIComponent(cat)}`}
                        className="block px-6 py-3.5 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 last:border-b-0 transition-all font-semibold text-[#0B1220]"
                        onClick={() => setIsCategoriesOpen(false)}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/messages"
                className="relative flex items-center gap-2 px-5 py-3 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                aria-label="Mesaje (3 necitite)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="hidden lg:inline">Mesaje</span>
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#6D5BFF] text-white text-xs rounded-full flex items-center justify-center font-black shadow-lg">3</span>
              </Link>

              <Link
                href="/favorites"
                className="flex items-center gap-2 px-5 py-3 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                aria-label="Anunțuri favorite"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden lg:inline">Favorite</span>
              </Link>

              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="Meniu utilizator"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 px-5 py-3 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden lg:inline">Cont</span>
                  <span className={`hidden xl:inline px-2 py-0.5 rounded-full text-xs font-black border ${
                    isLoggedIn
                      ? (isAdmin || userRole === 'owner'
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-green-100 text-green-700 border-green-200')
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {accountBadge}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-3 w-64 bg-white border-2 border-[#6D5BFF]/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                    role="menu"
                    aria-label="Meniu utilizator"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Stare sesiune</div>
                      <div className="mt-1 text-sm font-black text-[#0B1220]">
                        {isLoggedIn ? (userEmail || 'Utilizator autentificat') : 'Nu ești autentificat'}
                      </div>
                      <div className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${
                        isLoggedIn
                          ? (isAdmin || userRole === 'owner'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-green-100 text-green-700 border-green-200')
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {accountBadge}
                      </div>
                    </div>
                    {!isLoggedIn && (
                      <>
                        <Link href="/auth/login" className="flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 transition-all text-gray-900">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-bold">Autentificare</span>
                        </Link>
                        <Link href="/auth/signup" className="flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 transition-all text-gray-900">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          <span className="font-bold">Înregistrare</span>
                        </Link>
                      </>
                    )}
                    <Link href="/dashboard" className="flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 transition-all text-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-bold">Contul meu</span>
                    </Link>
                    <Link href="/dashboard/listings" className="flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 transition-all text-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-bold">Anunțurile mele</span>
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white border-b border-gray-100 transition-all text-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-bold">Setări</span>
                    </Link>
                    {isLoggedIn && (
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#6D5BFF] hover:text-white transition-all text-gray-900"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-bold">Logout</span>
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <Link href="/admin/dashboard" className="flex items-center gap-3 px-6 py-4 hover:bg-purple-600 hover:text-white border-b border-gray-100 transition-all text-gray-900 bg-purple-50">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                          <span className="font-bold">📊 Admin - Dashboard</span>
                        </Link>
                        <Link href="/admin/promotions" className="flex items-center gap-3 px-6 py-4 hover:bg-purple-600 hover:text-white border-b border-gray-100 transition-all text-gray-900 bg-purple-50">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-bold">💎 Admin - Promoții</span>
                        </Link>
                        <Link href="/admin/invoices" className="flex items-center gap-3 px-6 py-4 hover:bg-purple-600 hover:text-white border-b border-gray-100 transition-all text-gray-900 bg-purple-50">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="font-bold">💰 Admin - Facturi</span>
                        </Link>
                        <Link href="/admin/moderation" className="flex items-center gap-3 px-6 py-4 hover:bg-purple-600 hover:text-white transition-all text-gray-900 bg-purple-50">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="font-bold">🛡️ Admin - Moderare</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Link href="/listings/new" className="mobile-orange-btn flex items-center gap-2 text-base shadow-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden xl:inline font-black">ADAUGĂ ANUNȚ</span>
                <span className="xl:hidden font-black">ADAUGĂ</span>
              </Link>
            </nav>

            <button
              className="md:hidden flex flex-col gap-1.5 p-2 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Deschide/închide meniu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-300 rounded-full ${isMenuOpen ? "rotate-45 translate-y-2.5" : ""}`}></span>
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-300 rounded-full ${isMenuOpen ? "opacity-0" : ""}`}></span>
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-300 rounded-full ${isMenuOpen ? "-rotate-45 -translate-y-2.5" : ""}`}></span>
            </button>
          </div>

          <div className="mt-4 md:hidden">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Caută în anunțuri..."
                aria-label="Caută anunțuri mobile"
                className="w-full px-5 py-3 pr-12 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-[#6366F1]/30 outline-none transition-all"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2"
                aria-label="Caută"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <nav
              id="mobile-menu"
              className="md:hidden mt-4 pb-4 space-y-2 border-t border-gray-100 pt-4 animate-slide-in-up"
              aria-label="Navigare mobilă"
            >
              <div className="mx-2 mb-2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Stare sesiune</div>
                <div className="mt-1 text-sm font-black text-[#0B1220]">
                  {isLoggedIn ? (userEmail || 'Utilizator autentificat') : 'Nu ești autentificat'}
                </div>
                <div className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${
                  isLoggedIn
                    ? (isAdmin || userRole === 'owner'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-green-100 text-green-700 border-green-200')
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {accountBadge}
                </div>
              </div>
              <Link href="/listings" className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition font-semibold text-gray-700 hover:text-blue-600">
                <span className="text-xl">📋</span>
                <span>Toate anunțurile</span>
              </Link>
              <Link href="/messages" className="relative flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition font-semibold text-gray-700 hover:text-blue-600">
                <span className="text-xl">💬</span>
                <span>Mesaje</span>
                <span className="ml-auto w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
              </Link>
              <Link href="/favorites" className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-pink-50 hover:to-red-50 rounded-xl transition font-semibold text-gray-700 hover:text-pink-600">
                <span className="text-xl">❤️</span>
                <span>Favorite</span>
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition font-semibold text-gray-700 hover:text-blue-600">
                <span className="text-xl">👤</span>
                <span>Contul meu</span>
              </Link>

              <div className="pt-2">
                <Link
                  href="/listings/new"
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-xl transition font-bold text-lg"
                >
                  <span className="text-2xl">✨</span>
                  <span>Adaugă anunț gratuit</span>
                </Link>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2">
                {!isLoggedIn && (
                  <>
                    <Link
                      href="/auth/login"
                      className="flex items-center justify-center gap-2 px-4 py-3 text-center text-blue-600 hover:bg-blue-50 rounded-xl transition font-semibold"
                    >
                      <span>🔐</span>
                      <span>Autentificare</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center gap-2 px-4 py-3 text-center text-blue-600 hover:bg-blue-50 rounded-xl transition font-semibold"
                    >
                      <span>📝</span>
                      <span>Înregistrare</span>
                    </Link>
                  </>
                )}
                {isLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-center text-[#6D5BFF] hover:bg-[#6D5BFF] hover:text-white rounded-xl transition font-semibold"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
