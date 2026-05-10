"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ALL_CATEGORIES } from "@/lib/carData";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";
import { connectMessageEventsSse } from "@/lib/message-events-sse-client";

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (userStr && token) {
      const user = JSON.parse(userStr);
      setIsLoggedIn(true);
      setUserEmail(user.email || null);
      setUserRole(user.role || 'user');
      setUserName(user.name || null);
      if (user.role === "admin" || user.role === "owner") {
        setIsAdmin(true);
      }
    } else {
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserRole(null);
      setUserName(null);
    }
  }, []);

  // Badge mesaje: endpoint ușor + interval rezonabil; pauză când tab-ul e ascuns
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!isLoggedIn || !token) return;

    const POLL_MS = 8000;

    const checkUnread = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const response = await fetchWithAuthRefresh("/api/messages/unread-count");
        if (response.ok) {
          const data = (await response.json()) as { count?: number };
          setUnreadCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        /* ignore */
      }
    };

    const schedule = () => {
      if (unreadTimerRef.current) clearInterval(unreadTimerRef.current);
      void checkUnread();
      unreadTimerRef.current = setInterval(checkUnread, POLL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkUnread();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    const disposeSse = connectMessageEventsSse({
      onOpen: () => {
        void checkUnread();
      },
      onMessage: (ev) => {
        let d: { type?: string };
        try {
          d = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (d.type !== "message") return;
        void checkUnread();
      },
    });

    return () => {
      if (unreadTimerRef.current) clearInterval(unreadTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      disposeSse();
    };
  }, [isLoggedIn]);

  /** Pregătește rutele folosite des ca navigarea să pară instant (bundle + date) */
  useEffect(() => {
    if (!isLoggedIn) return;
    router.prefetch("/messages");
    router.prefetch("/favorites");
    router.prefetch("/dashboard");
    router.prefetch("/listings");
  }, [isLoggedIn, router]);

  const getAccountBadge = () => {
    if (!isLoggedIn) return 'DELOGAT';
    if (isAdmin) return 'ADMIN';
    
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

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/listings?q=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    try {
      const { getCsrfToken } = await import('@/lib/security/csrf-client');
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
    } catch (error) {
      // Ignore network errors for logout
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-1/2 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-[200] focus:-translate-x-1/2 focus:rounded-xl focus:border focus:border-white/10 focus:bg-[var(--bg-elevated)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-[var(--shadow-xl)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
      >
        Salt la conținut principal
      </a>

      <header
        className="sticky top-0 z-50 border-b border-neutral-200/90 bg-white/[0.97] shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md"
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
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-5 md:gap-6">
            <Link href="/" className="group flex items-center gap-3 hover:opacity-90 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF] focus-visible:rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-xl flex items-center justify-center text-2xl shadow-md group-hover:shadow-lg transition-smooth group-hover:scale-105">
                📦
              </div>
              <div className="hidden sm:block">
                <div className="text-xl font-black text-[#0B1220] leading-tight">ClickAnunț</div>
                <div className="text-[10px] text-[#6D5BFF] font-bold uppercase tracking-wide">Anunțuri gratuite</div>
              </div>
            </Link>

            <div className="flex-1 max-w-4xl hidden md:block">
              <div className="flex h-11 items-center rounded-xl border border-neutral-200 bg-white/95 px-2 shadow-sm shadow-neutral-900/5 transition-smooth focus-within:border-primary-500/35 focus-within:ring-2 focus-within:ring-primary-500/15">
                <span className="pl-3 pr-2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Ce cauți astăzi?"
                  aria-label="Caută anunțuri"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="flex-1 h-full bg-transparent text-[#0B1220] text-sm font-medium placeholder:text-gray-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-8 rounded-lg border border-primary-500/20 bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm transition-smooth hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-1"
                  aria-label="Caută"
                >
                  Caută
                </button>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex md:gap-2 lg:gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  aria-label="Meniu categorii"
                  aria-expanded={isCategoriesOpen}
                  aria-haspopup="true"
                  className="hit-target flex items-center gap-2 px-4 py-2.5 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition-smooth font-semibold rounded-xl border border-transparent hover:border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Categorii
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isCategoriesOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50 animate-fadeIn"
                    role="menu"
                    aria-label="Lista categorii"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <Link
                        key={cat}
                        href={`/listings?category=${encodeURIComponent(cat)}`}
                        className="block px-5 py-3 hover:bg-[#6D5BFF]/10 hover:text-[#6D5BFF] border-b border-gray-100 last:border-b-0 transition-smooth font-medium text-[#0B1220] first:rounded-t-xl last:rounded-b-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6D5BFF]"
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
                prefetch
                onMouseEnter={() => isLoggedIn && router.prefetch("/messages")}
                className="group hit-target relative flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[#0B1220] transition-colors duration-normal ease-premium hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Mesaje"
              >
                <div className="relative flex items-center justify-center">
                  <svg className="h-7 w-7 text-[#0B1220] transition-colors group-hover:text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="hidden text-sm font-semibold lg:inline">Mesaje</span>
              </Link>

              <Link
                href="/favorites"
                className="hit-target flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[#0B1220] transition-colors duration-normal ease-premium hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Anunțuri favorite"
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden text-sm font-semibold lg:inline">Favorite</span>
              </Link>

              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="Meniu utilizator"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="hit-target flex items-center gap-2 px-4 py-2.5 text-[#0B1220] hover:text-[#6D5BFF] hover:bg-gray-50 transition-smooth font-semibold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden lg:inline">Cont</span>
                  <span
                    className={`hidden xl:inline-flex min-h-[1.625rem] items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isLoggedIn
                        ? isAdmin || userRole === "owner"
                          ? "border-violet-200/80 bg-violet-50 text-violet-800"
                          : "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200 bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {accountBadge}
                  </span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn"
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

              <Link href="/listings/new" className="hit-target ml-1 flex items-center gap-2 rounded-xl border border-primary-400/35 bg-primary-600 px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-primary-900/25 ring-1 ring-white/10 transition-all duration-normal ease-premium hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden xl:inline">ADAUGĂ ANUNȚ</span>
                <span className="xl:hidden">ADAUGĂ</span>
              </Link>
            </nav>

            <button
              className="hit-target md:hidden flex flex-col gap-1.5 p-2 hover:bg-gray-100 rounded-xl transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Deschide/închide meniu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-200 rounded-full ${isMenuOpen ? "rotate-45 translate-y-2.5" : ""}`}></span>
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-200 rounded-full ${isMenuOpen ? "opacity-0" : ""}`}></span>
              <span className={`block w-7 h-1 bg-[#003D5C] transition-all duration-200 rounded-full ${isMenuOpen ? "-rotate-45 -translate-y-2.5" : ""}`}></span>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full rounded-xl border-2 border-transparent bg-white px-5 py-3 pr-12 text-[#0B1220] outline-none transition-all placeholder:text-gray-500 focus:border-primary-500/40 focus:shadow-sm focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-primary-500/20 bg-primary-600 text-white shadow-sm transition-all hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:ring-offset-2"
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
              <Link href="/listings" className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-neutral-100 hover:text-primary-700">
                <span className="text-xl">📋</span>
                <span>Toate anunțurile</span>
              </Link>
              <Link
                href="/messages"
                prefetch
                onMouseEnter={() => isLoggedIn && router.prefetch("/messages")}
                className="relative flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-neutral-100 hover:text-primary-700"
              >
                <span className="text-xl">💬</span>
                <span>Mesaje</span>
                {/* Badge will be dynamic when messaging system is implemented */}
              </Link>
              <Link href="/favorites" className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-neutral-100 hover:text-primary-700">
                <span className="text-xl">❤️</span>
                <span>Favorite</span>
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-neutral-100 hover:text-primary-700">
                <span className="text-xl">👤</span>
                <span>Contul meu</span>
              </Link>

              <div className="pt-2">
                <Link
                  href="/listings/new"
                  className="flex items-center justify-center gap-3 rounded-xl border border-primary-500/25 bg-primary-600 px-4 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-primary-500"
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
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold text-primary-700 transition hover:bg-neutral-100"
                    >
                      <span>🔐</span>
                      <span>Autentificare</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold text-primary-700 transition hover:bg-neutral-100"
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
