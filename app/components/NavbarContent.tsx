"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ALL_CATEGORIES } from "@/lib/carData";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";
import { subscribeMessagingInboxSync } from "@/lib/messaging-broadcast-sync";
import { connectMessageEventsSse } from "@/lib/message-events-sse-client";

export default function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname() || "/";
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

    const POLL_MS = 3000;

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

    const disposeInboxPing = subscribeMessagingInboxSync(() => {
      void checkUnread();
    });

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
        const kind = typeof d.type === "string" ? d.type : "";
        if (kind === "heartbeat" || kind === "connected") return;
        if (
          kind !== "message" &&
          kind !== "unread_update" &&
          kind !== "conversation_update"
        ) {
          return;
        }
        void checkUnread();
      },
    });

    return () => {
      if (unreadTimerRef.current) clearInterval(unreadTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      disposeInboxPing();
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

  const categoryMenuItems = ALL_CATEGORIES.map((cat) => (
    <Link
      key={cat}
      href={`/listings?category=${encodeURIComponent(cat)}`}
      className="block px-5 py-3 hover:bg-[#6D5BFF]/10 hover:text-[#6D5BFF] border-b border-gray-100 last:border-b-0 transition-smooth font-medium text-[#0B1220] first:rounded-t-xl last:rounded-b-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6D5BFF]"
      onClick={() => setIsCategoriesOpen(false)}
    >
      {cat}
    </Link>
  ));

  const userMenuPanel = (
    <>
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Stare sesiune</div>
        <div className="mt-1 text-sm font-black text-[#0B1220]">
          {isLoggedIn ? (userEmail || 'Utilizator autentificat') : 'Nu ești autentificat'}
        </div>
        <div
          className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${
            isLoggedIn
              ? isAdmin || userRole === 'owner'
                ? 'bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-green-100 text-green-700 border-green-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}
        >
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
          type="button"
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
    </>
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 md:px-5 md:py-2">
          <div className="grid w-full max-w-full min-h-[2.875rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0 md:hidden min-[380px]:min-h-[3rem] min-[380px]:gap-x-3">
            <div className="navbar-mobile-logo-cell">
              <Link
                href="/"
                aria-label="ClickAnunț — pagina principală"
                className="group flex min-w-0 max-w-full items-center gap-1.5 rounded-lg hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151a] md:gap-2"
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 ring-1 ring-white/10 sm:h-10 sm:w-10">
                  <span className="text-base leading-none sm:text-lg" aria-hidden>
                    📦
                  </span>
                </div>
                {/* Breakpoint-uri Tailwind standard (sm:) — același arbore la SSR și la client */}
                <div className="hidden min-w-0 flex-1 overflow-hidden leading-tight sm:block">
                  <div className="truncate text-[11px] font-semibold tracking-tight text-zinc-100 sm:text-xs">
                    ClickAnunț
                  </div>
                  <div className="hidden truncate text-[7px] font-semibold uppercase tracking-[0.1em] text-zinc-500 sm:block sm:text-[7.5px]">
                    Piață din România
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex min-w-0 items-center self-center">
              <div className="relative flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-full border border-white/[0.1] bg-[#1a1d24] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color] duration-200 focus-within:border-orange-500/35 focus-within:ring-1 focus-within:ring-orange-500/20 sm:h-[2.625rem]">
                <span className="pointer-events-none flex shrink-0 items-center pl-2 text-zinc-500" aria-hidden>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
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
                  className="min-h-0 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-[13px] font-medium tracking-tight text-zinc-100 outline-none ring-0 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="mr-0.5 shrink-0 rounded-full border-l border-white/[0.08] bg-[#ff5a00] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#e65200] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/50 sm:px-3 sm:text-xs"
                >
                  Caută
                </button>
              </div>
            </div>

            <div className="flex min-w-0 shrink-0 flex-row flex-nowrap items-center justify-self-end gap-1 max-[360px]:gap-0.5 min-[380px]:gap-2">
              <Link
                href="/favorites"
                prefetch={false}
                className={`navbar-mobile-icon-btn ${
                  pathname.startsWith("/favorites")
                    ? "!border-orange-500/40 !bg-orange-500/15 ring-1 ring-orange-500/25"
                    : ""
                }`}
                aria-label="Favorite"
              >
                <svg className="h-[18px] w-[18px] text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>
              <Link
                href="/messages"
                prefetch={false}
                className={`navbar-mobile-icon-btn relative ${
                  pathname.startsWith("/messages")
                    ? "!border-orange-500/40 !bg-orange-500/15 ring-1 ring-orange-500/25"
                    : ""
                }`}
                aria-label="Mesaje"
              >
                <svg className="h-[18px] w-[18px] text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-orange-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-[#12151a]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/listings/new"
                className="navbar-mobile-icon-btn"
                aria-label="Adaugă anunț"
              >
                <svg className="h-5 w-5 text-orange-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </Link>
              <button
                type="button"
                className="navbar-mobile-icon-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Deschide/închide meniu"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="flex flex-col justify-center gap-[5px]">
                  <span
                    className={`block h-0.5 w-[1.125rem] rounded-full bg-zinc-300 transition-all duration-200 ${isMenuOpen ? "translate-y-[7px] rotate-45" : ""}`}
                  />
                  <span
                    className={`block h-0.5 w-[1.125rem] rounded-full bg-zinc-300 transition-all duration-200 ${isMenuOpen ? "opacity-0" : ""}`}
                  />
                  <span
                    className={`block h-0.5 w-[1.125rem] rounded-full bg-zinc-300 transition-all duration-200 ${isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="hidden md:grid md:w-full md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-2.5 lg:gap-5">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 rounded-lg hover:opacity-95 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1d24] text-lg text-white shadow-sm ring-1 ring-white/[0.08] transition-smooth group-hover:bg-[#23262e]">
                📦
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-semibold leading-tight text-zinc-50">ClickAnunț</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Piață din România</div>
              </div>
            </Link>

            <div className="flex min-w-0 justify-center px-1">
              <div className="w-full max-w-4xl">
              <div className="flex h-9 items-center rounded-full border border-white/[0.1] bg-[#1a1d24] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-smooth focus-within:border-orange-500/35 focus-within:ring-1 focus-within:ring-orange-500/20">
                <span className="pl-2 pr-2 text-zinc-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Caută în anunțuri..."
                  aria-label="Caută anunțuri"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="flex-1 h-full rounded-md bg-transparent text-sm font-medium text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-7 shrink-0 rounded-full bg-[#ff5a00] px-4 text-xs font-semibold text-white transition-smooth hover:bg-[#e65200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101318]"
                  aria-label="Caută"
                >
                  Caută
                </button>
              </div>
              </div>
            </div>

            <nav className="flex shrink-0 items-center justify-end gap-1 md:gap-2 lg:gap-3">
              <Link
                href="/favorites"
                prefetch={false}
                className={`hit-target hidden items-center justify-center rounded-lg p-2 text-zinc-300 transition-smooth hover:bg-white/[0.06] md:inline-flex ${
                  pathname.startsWith("/favorites") ? "bg-white/[0.08] text-orange-400 ring-1 ring-white/10" : ""
                }`}
                aria-label="Favorite"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>
              <Link
                href="/messages"
                prefetch={false}
                className={`hit-target relative hidden items-center justify-center rounded-lg p-2 text-zinc-300 transition-smooth hover:bg-white/[0.06] md:inline-flex ${
                  pathname.startsWith("/messages") ? "bg-white/[0.08] text-orange-400 ring-1 ring-white/10" : ""
                }`}
                aria-label="Mesaje"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-orange-600 px-0.5 text-[9px] font-bold text-white ring-2 ring-[#12151a]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  aria-label="Meniu categorii"
                  aria-expanded={isCategoriesOpen}
                  aria-haspopup="true"
                  className="hit-target flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-semibold text-zinc-200 transition-smooth hover:border-white/10 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35"
                >
                  <svg className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {categoryMenuItems}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="Meniu utilizator"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="hit-target flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-zinc-200 transition-smooth hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35"
                >
                  <svg className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {userMenuPanel}
                  </div>
                )}
              </div>

              <Link href="/listings/new" className="hit-target ml-0.5 flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-[#ff5a00] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#e65200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101318]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden xl:inline">+ Adaugă anunț</span>
                <span className="xl:hidden">+ Adaugă</span>
              </Link>
            </nav>
          </div>

          {isMenuOpen && (
            <nav
              id="mobile-menu"
              className="md:hidden mt-4 space-y-2 border-t border-white/[0.08] pb-4 pt-4 animate-slide-in-up"
              aria-label="Navigare mobilă"
            >
              <div className="mx-2 mb-2 rounded-xl border border-white/[0.1] bg-zinc-900/85 px-4 py-3 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stare sesiune</div>
                <div className="mt-1 text-sm font-black text-zinc-50">
                  {isLoggedIn ? (userEmail || 'Utilizator autentificat') : 'Nu ești autentificat'}
                </div>
                <div
                  className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-black ${
                    isLoggedIn
                      ? isAdmin || userRole === "owner"
                        ? "border-violet-500/35 bg-violet-950/75 text-violet-200"
                        : "border-emerald-500/35 bg-emerald-950/75 text-emerald-200"
                      : "border-zinc-600/60 bg-zinc-800/90 text-zinc-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {accountBadge}
                </div>
              </div>
              <Link
                href="/listings"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="text-xl">📋</span>
                <span>Toate anunțurile</span>
              </Link>
              <Link
                href="/messages"
                prefetch
                onMouseEnter={() => isLoggedIn && router.prefetch("/messages")}
                className="relative flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="text-xl">💬</span>
                <span className="flex flex-1 items-center justify-between gap-2">
                  Mesaje
                  {unreadCount > 0 ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </span>
              </Link>
              <Link
                href="/favorites"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="text-xl">❤️</span>
                <span>Favorite</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
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

              <div className="space-y-2 border-t border-white/[0.08] pt-3">
                {!isLoggedIn && (
                  <>
                    <Link
                      href="/auth/login"
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold text-indigo-300 transition hover:bg-white/[0.06]"
                    >
                      <span>🔐</span>
                      <span>Autentificare</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold text-indigo-300 transition hover:bg-white/[0.06]"
                    >
                      <span>📝</span>
                      <span>Înregistrare</span>
                    </Link>
                  </>
                )}
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold text-indigo-300 transition hover:bg-white/[0.06]"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </nav>
          )}
    </div>
  );
}
