"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { cacheWebUserProfile } from "@/lib/auth/clear-legacy-web-auth-storage";
import { Card, Badge, Button, Tabs, Avatar } from "@/app/components/ui";
import { ListingCard } from "@/app/components/composite";
const ViewsLast7DaysChart = dynamic(
  () => import("@/app/components/dashboard/ViewsLast7DaysChart"),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045] md:p-6"
        aria-busy="true"
        aria-label="Se încarcă graficul"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
        <div className="mb-5 h-3 w-24 animate-pulse rounded bg-zinc-800/70" />
        <div className="mb-2 h-4 w-56 animate-pulse rounded bg-zinc-800/50" />
        <div className="relative mt-4 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2 sm:p-3">
          <div className="h-[200px] w-full animate-pulse rounded-md bg-zinc-900/35 sm:h-[248px]" />
        </div>
      </div>
    ),
  }
);
import {
  fetchWithAuthRefresh,
  validateServerAuthSession,
  clearStaleBrowserAuth,
} from "@/lib/admin-fetch";
import { listingPrimaryPhotoSrc } from "@/lib/listing-photo-url";
import {
  isPaidSubscriptionTier,
  normalizeSubscriptionTier,
  shouldOfferBusinessDiscovery,
  subscriptionTierLabel,
} from "@/lib/subscription-tier";
import EmailVerificationBanner from "@/app/components/EmailVerificationBanner";

/**
 * Design tokens — exclusiv /dashboard (nu afectează alte rute sau componente globale).
 */
const dashPanel =
  "relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/90 to-[#0a0c10] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045]";

const dashHero =
  "relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-900/70 via-zinc-950/95 to-[#07080c] p-6 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.06] md:p-8";

const statCardInteractive =
  "group relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/95 p-4 shadow-md shadow-black/35 ring-1 ring-white/[0.04] transition-all duration-300 hover:border-orange-500/25 hover:shadow-[0_0_36px_-10px_rgba(249,115,22,0.14)] hover:ring-orange-500/15 md:p-5";

const statCardStatic =
  "relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/95 p-4 shadow-md shadow-black/35 ring-1 ring-white/[0.04] md:p-5";

const statIconWell =
  "relative mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700/55 bg-gradient-to-br from-zinc-800/90 to-zinc-950 text-orange-400/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const ctaPrimary =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const ctaPrimaryGhost =
  "flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-600/70 bg-zinc-950/70 px-4 text-sm font-medium text-zinc-100 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800/60";

/** Carduri în tab-uri (overview / activitate). */
const tabSurface =
  "overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.05]";

export default function DashboardPage() {
  const router = useRouter();
  /** Evită mismatch SSR/client: primul paint nu citește localStorage (doar după mount). */
  const [clientReady, setClientReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeListings: 0,
    totalViews: 0,
    messages: 0,
    favorites: 0,
    viewsLast7Days: [] as { date: string; views: number }[],
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const refreshUser = async (fallbackUser?: any) => {
    try {
      const response = await fetchWithAuthRefresh('/api/users/me');
      if (!response.ok) return;

      const data = await response.json();
      const mergedUser = { ...(fallbackUser || {}), ...data };
      setUser(mergedUser);
      cacheWebUserProfile(mergedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetchWithAuthRefresh("/api/dashboard/stats");
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          const s = data.stats;
          setStats({
            activeListings: s.activeListings ?? 0,
            totalViews: s.totalViews ?? 0,
            messages: s.messages ?? 0,
            favorites: s.favorites ?? 0,
            viewsLast7Days: Array.isArray(s.viewsLast7Days)
              ? s.viewsLast7Days
              : [],
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const normalizeListingStatus = (listing: any) => {
    const raw = listing?.status || listing?.moderationStatus || 'active';
    if (raw === 'approved') return 'active';
    if (raw === 'rejected') return 'rejected';
    return String(raw).toLowerCase();
  };

  const formatPrice = (listing: any) => {
    if (listing?.price) return String(listing.price);
    const amount = listing?.priceAmount;
    const currency = listing?.priceCurrency || 'RON';
    if (typeof amount === 'number') {
      return `${amount.toLocaleString('ro-RO')} ${currency}`;
    }
    return 'Pret la cerere';
  };

  const formatLocation = (listing: any) => {
    const city = listing?.city;
    const county = listing?.county;
    if (city && county) return `${city}, ${county}`;
    return city || county || 'Romania';
  };

  const formatPostedAt = (listing: any) => {
    const createdAt = listing?.createdAt ? new Date(listing.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return 'Recent';
    return createdAt.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      setListingsError(null);

      const userStr = localStorage.getItem('user');
      const response = await fetchWithAuthRefresh(
        '/api/listings?userId=me&status=all',
        {
          credentials: 'include',
          cache: 'no-store',
          headers: userStr ? { 'X-User-Info': btoa(userStr) } : {},
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/auth/login?redirect=/dashboard');
          return;
        }
        setListings([]);
        setListingsError('Nu am putut încărca anunțurile.');
        return;
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.listings || data.data || [];
      setListings(items);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setListings([]);
      setListingsError('Nu am putut încărca anunțurile.');
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;

    let cancelled = false;

    const init = async () => {
      let fallbackUser: any = null;
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          fallbackUser = JSON.parse(userData);
          setUser(fallbackUser);
        } catch {
          fallbackUser = null;
        }
      }

      const session = await validateServerAuthSession();
      if (cancelled) return;

      if (!session.ok) {
        if (session.transient && fallbackUser) {
          setIsAuthenticated(true);
          void fetchStats();
          void fetchListings();
          setIsLoading(false);
          return;
        }
        clearStaleBrowserAuth();
        router.push('/auth/login?redirect=/dashboard');
        setIsLoading(false);
        return;
      }

      const sessionUser = session.user
        ? { ...(fallbackUser || {}), ...session.user }
        : fallbackUser;
      if (sessionUser) {
        setUser(sessionUser);
        cacheWebUserProfile(sessionUser);
      }
      setIsAuthenticated(true);
      void fetchStats();
      void refreshUser(sessionUser ?? undefined);
      void fetchListings();
      setIsLoading(false);
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [clientReady, router]);

  if (!clientReady || isLoading) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030304]"
        suppressHydrationWarning
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(251,146,60,0.08),transparent_55%)]" />
        <div className="relative text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-orange-500 shadow-lg shadow-orange-950/20" />
          <p className="text-sm font-medium tracking-tight text-zinc-500">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const activeListings = listings.filter((listing) => normalizeListingStatus(listing) === 'active');
  const recentListings = activeListings.slice(0, 3);
  const sellerName = user?.name || user?.email || 'Contul meu';
  const sellerInitials = getInitials(sellerName);

  return (
    <div
      data-dashboard-surface="dashboard-v2"
      className="relative min-h-screen bg-[#030304] text-zinc-100 antialiased selection:bg-orange-500/30"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.09),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_36%_at_100%_0%,rgba(139,92,246,0.07),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_38%_32%_at_0%_100%,rgba(59,130,246,0.05),transparent_48%)]" />
      </div>

      <Navbar />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className="mb-7 h-px w-full bg-gradient-to-r from-transparent via-orange-500/35 to-transparent md:mb-9" aria-hidden />

        <EmailVerificationBanner />

        <header className="mb-8 md:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Cont</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">Dashboard</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            Performanța anunțurilor și acces rapid la acțiunile tale.
          </p>
        </header>

        {/* Hero */}
        <section className={`relative mb-8 md:mb-10 ${dashHero}`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.04)_0%,transparent_42%,transparent_58%,rgba(249,115,22,0.045)_100%)]" />
          <div className="pointer-events-none absolute -right-28 -top-32 h-[20rem] w-[20rem] rounded-full bg-orange-500/[0.09] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 -left-24 h-[17rem] w-[17rem] rounded-full bg-violet-600/[0.07] blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="rounded-full bg-gradient-to-br from-orange-400/35 via-zinc-500/25 to-violet-500/25 p-[3px] shadow-xl shadow-black/50 ring-1 ring-white/10">
                  <div className="rounded-full bg-zinc-950 p-1">
                    <Avatar
                      size="xl"
                      className="shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]"
                      initials={
                        user.name
                          ? user.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                          : "U"
                      }
                      status="online"
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {user.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verificat
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Activ
                    </span>
                  )}
                  {isPaidSubscriptionTier(user.subscriptionTier) && (
                    <Badge variant="primary" outlined className="text-xs">
                      {subscriptionTierLabel(user.subscriptionTier)}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {user.name || "Utilizator"}
                </h2>
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  {user.email}
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition hover:text-orange-400/95"
                >
                  <span>Editează profilul</span>
                  <span className="text-orange-400/80" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:justify-end lg:w-auto lg:flex-col lg:items-stretch">
              <Link href="/listings/new" className={`${ctaPrimary} lg:min-w-[11rem]`}>
                <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Adaugă anunț
              </Link>
            </div>
          </div>
        </section>

        {/* KPI */}
        <section className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:mb-10 lg:grid-cols-4">
          <Link href="/dashboard/listings" className="group block h-full">
            <div className={statCardInteractive}>
              <div className="flex items-start justify-between">
                <div className={statIconWell}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-9 w-24 rounded-md bg-zinc-800" />
                  <div className="h-3 w-36 rounded bg-zinc-800/60" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                    {stats.activeListings}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Anunțuri active
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-zinc-600 opacity-0 transition group-hover:opacity-100">
                    Deschide listă →
                  </p>
                </>
              )}
            </div>
          </Link>

          <div className={statCardStatic}>
            <div className={statIconWell}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-9 w-32 rounded-md bg-zinc-800" />
                <div className="h-3 w-36 rounded bg-zinc-800/60" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                  {stats.totalViews.toLocaleString("ro-RO")}
                </p>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Vizualizări totale
                </p>
              </>
            )}
          </div>

          <Link href="/dashboard/messages" className="group block h-full">
            <div className={statCardInteractive}>
              <div className="flex items-start justify-between">
                <div className={`relative ${statIconWell}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  {!statsLoading && stats.messages > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded bg-orange-600 px-1 text-[10px] font-semibold text-white">
                      {stats.messages > 9 ? "9+" : stats.messages}
                    </span>
                  )}
                </div>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-9 w-16 rounded-md bg-zinc-800" />
                  <div className="h-3 w-28 rounded bg-zinc-800/60" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                    {stats.messages}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Mesaje</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {stats.messages === 1
                      ? "1 necitit"
                      : stats.messages > 1
                        ? `${stats.messages} necitite`
                        : "Niciun mesaj nou"}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-zinc-600 opacity-0 transition group-hover:opacity-100">
                    Inbox →
                  </p>
                </>
              )}
            </div>
          </Link>

          <Link href="/dashboard/favorites" className="group block h-full">
            <div className={statCardInteractive}>
              <div className={statIconWell}>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-9 w-16 rounded-md bg-zinc-800" />
                  <div className="h-3 w-32 rounded bg-zinc-800/60" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-[1.75rem] md:leading-none">
                    {stats.favorites}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Favorite</p>
                  <p className="mt-2 text-[11px] font-medium text-zinc-600 opacity-0 transition group-hover:opacity-100">
                    Colecție →
                  </p>
                </>
              )}
            </div>
          </Link>
        </section>

        {/* Analytics */}
        <section className="mb-7 lg:mb-9">
          <ViewsLast7DaysChart
            data={stats.viewsLast7Days}
            totalViewsHint={stats.totalViews}
          />
        </section>

        {/* Quick actions */}
        <section className="mb-10 md:mb-12">
          <div className={`p-6 md:p-7 ${dashPanel}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Acțiuni</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Acțiuni rapide</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
                Publică sau actualizează anunțurile în câteva secunde.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link href="/listings/new" className={ctaPrimary}>
                  <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adaugă anunț
                </Link>
                <Link href="/dashboard/listings" className={ctaPrimaryGhost}>
                  <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Gestionează anunțuri
                </Link>
              </div>
              <div className="mt-5 flex justify-center border-t border-zinc-800/60 pt-5 sm:justify-start">
                <Link
                  href="/dashboard/invoices"
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Facturi și plăți
                  <span className="text-orange-400/70" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-14">
          <Tabs.List className="flex w-full gap-1 overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] shadow-black/40 backdrop-blur-md sm:overflow-visible">
            <Tabs.Trigger value="overview" className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm sm:flex-none sm:px-5">
              Privire generală
            </Tabs.Trigger>
            <Tabs.Trigger value="listings" className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm sm:flex-none sm:px-5">
              Anunțurile mele
            </Tabs.Trigger>
            <Tabs.Trigger value="activity" className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm sm:flex-none sm:px-5">
              Activitate
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="mt-8">
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <Card variant="elevated" className={tabSurface}>
                <Card.Body className="p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-white">Plan actual</h3>
                      <p className="mt-0.5 text-sm text-zinc-500">Statusul contului și opțiuni pentru companii.</p>
                    </div>
                    <Badge
                      variant={
                        normalizeSubscriptionTier(user.subscriptionTier) === "free"
                          ? "primary"
                          : "warning"
                      }
                      className="w-fit"
                    >
                      {subscriptionTierLabel(user.subscriptionTier)}
                    </Badge>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                    {normalizeSubscriptionTier(user.subscriptionTier) === "free"
                      ? "Contul tău este pe nivelul gratuit."
                      : normalizeSubscriptionTier(user.subscriptionTier) === "business"
                        ? "Cont Business activ. Detaliile comerciale se stabilesc pe baza necesarului."
                        : "Cont Premium activ. Detaliile comerciale se stabilesc pe baza necesarului."}
                  </p>
                  {shouldOfferBusinessDiscovery(user.subscriptionTier) && (
                    <div className="space-y-2">
                      <Link
                        href="/business"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-500/30 bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-black/25 transition hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
                        data-testid="dashboard-business-cta"
                      >
                        Descoperă ClickAnunț Business
                      </Link>
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Soluții pentru dealeri și companii, stabilite în funcție de necesar.
                      </p>
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card variant="elevated" className={tabSurface}>
                <Card.Body className="p-5">
                  <h3 className="mb-4 text-base font-semibold tracking-tight text-white">Beneficii active</h3>
                  <div className="space-y-3.5 text-sm text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Credite disponibile</span>
                      <span className="font-semibold tabular-nums text-white">{user.creditsBalance ?? 0} RON</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Discount global</span>
                      <span className="font-semibold tabular-nums text-white">{user.promotionDiscountPercent ?? 0}%</span>
                    </div>
                    <div>
                      <div className="mb-2 text-zinc-500">Promovari gratuite</div>
                      {(() => {
                        const promotions = user?.promotionBenefits?.promotions || {};
                        const entries = Object.entries(promotions).filter(([, value]: any) => {
                          const count = value?.count || 0;
                          const expiresAt = value?.expiresAt ? new Date(value.expiresAt).getTime() : null;
                          const isActive = !expiresAt || expiresAt > Date.now();
                          return count > 0 && isActive;
                        });

                        if (entries.length === 0) {
                          return <div className="text-zinc-600">Nu ai promovari gratuite active.</div>;
                        }

                        return (
                          <ul className="space-y-1">
                            {entries.map(([type, value]: any) => (
                              <li key={type} className="flex items-center justify-between">
                                <span className="capitalize">{type}</span>
                                <span className="font-semibold tabular-nums text-white">{value?.count || 0}x</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Tabs.Content>

          <Tabs.Content value="listings" className="mt-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">Anunțurile mele</h3>
                  <p className="mt-1 text-sm text-zinc-500">Rezumat rapid; lista completă e pe pagina dedicată.</p>
                </div>
                <Link
                  href="/dashboard/listings"
                  className="text-sm font-medium text-orange-400/90 transition hover:text-orange-300"
                >
                  Vezi toate anunțurile →
                </Link>
              </div>

              {listingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-28 animate-pulse rounded-md border border-zinc-800/70 bg-zinc-900/30"
                    />
                  ))}
                </div>
              ) : listingsError ? (
                <div className="rounded-xl border border-red-900/40 bg-gradient-to-b from-red-950/35 to-red-950/10 p-6 text-sm leading-relaxed text-red-100/95 shadow-lg shadow-black/30 ring-1 ring-red-500/10">
                  {listingsError}
                </div>
              ) : recentListings.length === 0 ? (
                <div className={`relative overflow-hidden px-6 py-12 text-center md:px-12 md:py-14 ${dashPanel}`}>
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                  <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/70 bg-gradient-to-br from-zinc-800/80 to-zinc-950 text-zinc-500 shadow-inner">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="relative text-base font-semibold tracking-tight text-white">Nu ai anunțuri active</div>
                  <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                    Publică primul anunț pentru a apărea aici.
                  </p>
                  <div className="relative mt-7">
                    <Link href="/listings/new">
                      <Button variant="primary" size="sm">
                        Adaugă anunț
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {recentListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      price={formatPrice(listing)}
                      image={listingPrimaryPhotoSrc(listing.photos, listing.imageUrls)}
                      category={listing.category}
                      location={formatLocation(listing)}
                      description={listing.description}
                      postedAt={formatPostedAt(listing)}
                      verified={Boolean(user?.verified)}
                      featured={Boolean(listing.isFeatured || listing.isPromoted)}
                      seller={{
                        name: sellerName,
                        avatar: sellerInitials,
                        verified: Boolean(user?.verified),
                      }}
                      onClick={() => router.push(`/listings/${listing.id}`)}
                      className="rounded-md border border-zinc-800/85 bg-zinc-900/40 shadow-sm shadow-black/20 ring-1 ring-white/[0.03]"
                    />
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="activity" className="mt-8">
            <Card variant="elevated" className={tabSurface}>
              <Card.Body className="p-5">
                <h3 className="mb-4 text-base font-semibold tracking-tight text-white">Activitate recentă</h3>
                <div className="space-y-3">
                  {recentListings.length > 0 ? (
                    <>
                      {recentListings.slice(0, 3).map((listing) => (
                        <div key={listing.id} className="flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                          <svg className="mr-2.5 h-4 w-4 shrink-0 text-emerald-500/90" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Ai publicat anunțul "{listing.title}"</span>
                        </div>
                      ))}
                      {stats.messages > 0 && (
                        <div className="flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                          <svg className="mr-2.5 h-4 w-4 shrink-0 text-amber-500/90" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          <span>Ai primit {stats.messages} {stats.messages === 1 ? 'mesaj nou' : 'mesaje noi'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-700/60 bg-zinc-950/40 px-6 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-600">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-zinc-400">Nicio activitate recentă</p>
                      <p className="mt-1 text-xs text-zinc-600">Activitatea ta va apărea aici după ce publici anunțuri.</p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Tabs.Content>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
