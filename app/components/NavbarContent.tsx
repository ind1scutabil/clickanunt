"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALL_CATEGORIES } from "@/lib/carData";
import {
  fetchWithAuthRefresh,
  validateServerAuthSession,
  clearStaleBrowserAuth,
} from "@/lib/admin-fetch";
import AdminNavNotificationBell from "@/app/components/admin/AdminNavNotificationBell";
import { subscribeMessagingInboxSync } from "@/lib/messaging-broadcast-sync";
import { connectMessageEventsSse } from "@/lib/message-events-sse-client";
import { isAdminStaffRole } from "@/lib/is-admin-staff-client";
import { CLICKANUNT_AUTH_SESSION_EVENT } from "@/lib/auth-session-events";
import AccountMenuPanel from "@/app/components/account/AccountMenuPanel";
import { buildListingsSearchHref } from "@/lib/listings-search-url";

export default function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const activeCategoryParam = searchParams.get("category");
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
  const reconcileInFlightRef = useRef(false);

  useLayoutEffect(() => {
    let cancelled = false;

    const applyLoggedOut = () => {
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserRole(null);
      setUserName(null);
      setIsAdmin(false);
    };

    const applyUser = (user: {
      email?: string;
      role?: string;
      name?: string | null;
    }) => {
      setIsLoggedIn(true);
      setUserEmail(user.email || null);
      setUserRole(user.role || "user");
      setUserName(user.name || null);
      setIsAdmin(isAdminStaffRole(user.role));
    };

    const applyUserFromLocalStorage = () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return false;
      try {
        applyUser(JSON.parse(userStr) as {
          email?: string;
          role?: string;
          name?: string | null;
        });
        return true;
      } catch {
        return false;
      }
    };

    let rerunQueued = false;
    const reconcileSession = async () => {
      // If a reconcile is already running, don't start a second one — just queue
      // a single re-run so we never miss a real login/logout that arrived mid-flight.
      if (reconcileInFlightRef.current) {
        rerunQueued = true;
        return;
      }
      reconcileInFlightRef.current = true;
      try {
        const session = await validateServerAuthSession();
        if (cancelled) return;
        if (session.ok && session.user) {
          applyUser(session.user);
          return;
        }

        if (session.transient) {
          if (applyUserFromLocalStorage()) return;
          if (!cancelled) applyLoggedOut();
          return;
        }

        const hasStaleUser = Boolean(localStorage.getItem("user"));
        if (hasStaleUser) {
          clearStaleBrowserAuth();
        }
        if (!cancelled) applyLoggedOut();
      } finally {
        reconcileInFlightRef.current = false;
        if (rerunQueued && !cancelled) {
          rerunQueued = false;
          void reconcileSession();
        }
      }
    };

    const onSessionEvent = () => {
      void reconcileSession();
    };

    void reconcileSession();
    window.addEventListener("storage", onSessionEvent);
    window.addEventListener("focus", onSessionEvent);
    window.addEventListener(CLICKANUNT_AUTH_SESSION_EVENT, onSessionEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onSessionEvent);
      window.removeEventListener("focus", onSessionEvent);
      window.removeEventListener(CLICKANUNT_AUTH_SESSION_EVENT, onSessionEvent);
    };
  }, []);

  // Badge mesaje: endpoint ușor + interval rezonabil; pauză când tab-ul e ascuns
  useEffect(() => {
    if (!isLoggedIn) return;

    // Fallback cadence only — real-time unread updates arrive over SSE
    // (connectMessageEventsSse below) and the inbox broadcast channel. 30s is a
    // safety net, not the primary signal. (Was 3s → drove the refresh storm.)
    const POLL_MS = 30000;

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
    if (isAdmin) {
      router.prefetch("/admin/moderation");
      router.prefetch("/admin/dashboard");
    }
  }, [isLoggedIn, isAdmin, router]);

  const getAccountBadge = () => {
    if (!isLoggedIn) return "Intră în cont";
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
    router.push(buildListingsSearchHref(query));
  };

  /** Închide toate meniurile (mobil + desktop). */
  const closeAllMenus = useCallback(() => {
    setIsMenuOpen(false);
    setIsCategoriesOpen(false);
    setIsUserMenuOpen(false);
  }, []);

  /**
   * Logo / brand: pe altă rută → navigare normală la /. Pe homepage deja → scroll sus (fără „nimic nu se întâmplă”).
   */
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    closeAllMenus();
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    closeAllMenus();
    try {
      const csrfMod = await import("@/lib/security/csrf-client");
      const evMod = await import("@/lib/auth-session-events");
      const csrfToken = await csrfMod.getCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });
      csrfMod.clearCsrfTokenCache();
      evMod.broadcastAuthSessionChanged();
    } catch {
      try {
        const csrfMod = await import("@/lib/security/csrf-client");
        csrfMod.clearCsrfTokenCache();
      } catch {
        /* ignore */
      }
      try {
        const evMod = await import("@/lib/auth-session-events");
        evMod.broadcastAuthSessionChanged();
      } catch {
        /* ignore */
      }
    }
    try {
      const { clearLegacyWebAuthStorage } = await import(
        "@/lib/auth/clear-legacy-web-auth-storage"
      );
      clearLegacyWebAuthStorage({ broadcast: false });
    } catch {
      /* ignore */
    }
    setIsLoggedIn(false);
    setUserEmail(null);
    setUserRole(null);
    setUserName(null);
    setIsAdmin(false);
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const navElement = document.querySelector('header');
      
      // If click is outside nav element, close menus
      if (navElement && !navElement.contains(target)) {
        closeAllMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [closeAllMenus]);

  let decodedCategory: string | null = null;
  if (activeCategoryParam != null && activeCategoryParam !== "") {
    try {
      decodedCategory = decodeURIComponent(activeCategoryParam);
    } catch {
      decodedCategory = activeCategoryParam;
    }
  }

  const categoryMenuItems = ALL_CATEGORIES.map((cat) => {
    const isCatActive =
      pathname.startsWith("/listings") && decodedCategory !== null && decodedCategory === cat;
    return (
      <Link
        key={cat}
        href={`/listings?category=${encodeURIComponent(cat)}`}
        className={`group flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-sm font-medium transition first:rounded-t-xl last:rounded-b-xl last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 ${
          isCatActive
            ? "bg-orange-500/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,90,0,0.22)]"
            : "text-zinc-100 hover:bg-white/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(255,90,0,0.12)]"
        }`}
        onClick={() => closeAllMenus()}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-zinc-900/80 ring-1 ring-white/[0.04] transition ${
            isCatActive
              ? "border-orange-500/35 text-orange-200"
              : "border-zinc-700/80 text-orange-400/90 group-hover:border-orange-500/25 group-hover:text-orange-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate">{cat}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
            isCatActive ? "text-orange-300/90 opacity-100" : "text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 md:px-5 md:py-2">
          <div className="grid w-full max-w-full min-h-[2.875rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0 md:hidden min-[380px]:min-h-[3rem] min-[380px]:gap-x-3">
            <div className="navbar-mobile-logo-cell">
              <Link
                href="/"
                aria-label="ClickAnunț — pagina principală"
                onClick={handleLogoClick}
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

            <div className="relative z-0 flex min-w-0 items-center self-center">
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

            <div className="navbar-mobile-trailing-cell flex min-w-0 shrink-0 flex-row flex-nowrap items-center justify-self-end gap-1 max-[360px]:gap-0.5 min-[380px]:gap-2">
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
              <AdminNavNotificationBell variant="mobile" />
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
            <Link href="/" onClick={handleLogoClick} className="group flex shrink-0 items-center gap-2.5 rounded-lg hover:opacity-95 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:rounded-lg">
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
              <AdminNavNotificationBell variant="desktop" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsCategoriesOpen((prev) => !prev);
                  }}
                  aria-label="Meniu categorii"
                  aria-expanded={isCategoriesOpen}
                  aria-haspopup="true"
                  className={`hit-target flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold text-zinc-200 transition-smooth hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 ${
                    isCategoriesOpen ? "border-orange-500/25 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,90,0,0.12)]" : "border-transparent hover:border-white/10"
                  }`}
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
                    className="absolute left-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/80 shadow-[0_28px_80px_-16px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.05)] ring-1 ring-white/[0.06] backdrop-blur-2xl animate-fadeIn"
                    role="menu"
                    aria-label="Lista categorii"
                  >
                    {categoryMenuItems}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoriesOpen(false);
                    setIsUserMenuOpen((prev) => !prev);
                  }}
                  aria-label="Meniu utilizator"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className={`hit-target flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-zinc-200 transition-smooth hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 ${
                    isUserMenuOpen ? "ring-1 ring-orange-500/20 ring-offset-2 ring-offset-[#12151a]" : ""
                  }`}
                >
                  <svg className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden lg:inline">Cont</span>
                  <span
                    className={`hidden xl:inline-flex min-h-[1.625rem] items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                      isLoggedIn
                        ? isAdmin || userRole === "owner"
                          ? "border-violet-500/40 bg-violet-950/75 text-violet-100 ring-1 ring-violet-500/15 uppercase tracking-wider"
                          : "border-emerald-500/40 bg-emerald-950/75 text-emerald-100 ring-1 ring-emerald-500/15 uppercase tracking-wider"
                        : "border-orange-500/35 bg-orange-950/50 text-orange-100 ring-1 ring-orange-500/15 normal-case"
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
                    className="absolute right-0 top-full z-50 mt-2 w-72 max-h-[min(24rem,85vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-zinc-950/80 shadow-[0_28px_80px_-16px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.05)] ring-1 ring-white/[0.06] backdrop-blur-2xl animate-fadeIn [scrollbar-gutter:stable]"
                    role="menu"
                    aria-label="Meniu utilizator"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <AccountMenuPanel
                      surface="dropdown"
                      pathname={pathname}
                      isLoggedIn={isLoggedIn}
                      isAdmin={isAdmin}
                      userRole={userRole}
                      userEmail={userEmail}
                      accountBadge={accountBadge}
                      unreadCount={unreadCount}
                      onNavigate={closeAllMenus}
                      onLogout={handleLogout}
                    />
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
              className="md:hidden mt-4 max-h-[min(88dvh,calc(100dvh-5.5rem))] overflow-y-auto overscroll-y-contain border-t border-white/[0.08] pb-[max(6.75rem,calc(5.75rem+env(safe-area-inset-bottom,0px)))] pt-4 animate-slide-in-up [scrollbar-gutter:stable]"
              aria-label="Navigare mobilă"
            >
              <AccountMenuPanel
                surface="sheet"
                pathname={pathname}
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
                userRole={userRole}
                userEmail={userEmail}
                accountBadge={accountBadge}
                unreadCount={unreadCount}
                onNavigate={closeAllMenus}
                onLogout={handleLogout}
              />
            </nav>
          )}
    </div>
  );
}
