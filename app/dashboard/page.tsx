"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Card, Badge, Button, Tabs, Avatar } from "@/app/components/ui";
import { ListingCard } from "@/app/components/composite";
import { ViewsLast7DaysChart } from "@/app/components/dashboard/ViewsLast7DaysChart";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";
import { listingPrimaryPhotoSrc } from "@/lib/listing-photo-url";

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
    viewsLast7Days: [] as { date: string; views: number }[],
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const refreshUser = async (token: string, fallbackUser?: any) => {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const mergedUser = { ...(fallbackUser || {}), ...data };
      setUser(mergedUser);
      localStorage.setItem('user', JSON.stringify(mergedUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
      });
      
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
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login?redirect=/dashboard');
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
      
      // Fetch real stats
      fetchStats();

      // Refresh user details (benefits, credits, discounts)
      refreshUser(token, parsedUser);

      // Fetch user listings for dashboard
      fetchListings();
    } catch (e) {
      console.error('Failed to parse user data:', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/auth/login?redirect=/dashboard');
    }

    setIsLoading(false);
  }, [router]);

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
    return null;
  }

  const activeListings = listings.filter((listing) => normalizeListingStatus(listing) === 'active');
  const recentListings = activeListings.slice(0, 3);
  const sellerName = user?.name || user?.email || 'Contul meu';
  const sellerInitials = getInitials(sellerName);

  return (
    <div className="min-h-screen bg-[#0B0F17] relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/3 h-[28rem] w-[28rem] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_45%)]" />
      </div>
      
      <Navbar />

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-base text-white/50">
            Performanța anunțurilor și acces rapid la acțiunile tale.
          </p>
        </div>

        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_32px_120px_-40px_rgba(99,102,241,0.45)] backdrop-blur-2xl md:mb-10 md:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-[90px]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-tr from-violet-500/40 to-cyan-400/30 blur-xl" />
                <div className="relative rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 p-[3px] shadow-lg shadow-violet-500/20">
                  <div className="rounded-full bg-[#0B0F17] p-1">
                    <Avatar
                      size="xl"
                      className="scale-110 sm:scale-125"
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verificat
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/70">
                      Activ
                    </span>
                  )}
                  {user.role === "premium" && (
                    <Badge variant="primary" outlined className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  {user.name || "Utilizator"}
                </h2>
                <p className="mt-1 truncate text-sm text-white/45 md:text-base">
                  {user.email}
                </p>
                <Link
                  href="/dashboard/account"
                  className="mt-4 inline-flex items-center text-sm font-medium text-violet-300/90 transition hover:text-white"
                >
                  Editează profilul
                  <span className="ml-1" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:justify-end lg:w-auto lg:flex-col">
              <Link
                href="/listings/new"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_48px_-12px_rgba(139,92,246,0.55)] transition hover:brightness-110 hover:shadow-[0_20px_56px_-12px_rgba(139,92,246,0.65)] sm:w-auto lg:w-full lg:min-w-[220px]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mb-10 lg:grid-cols-4">
          <Link href="/dashboard/listings" className="group block h-full">
            <div className="flex h-full min-h-[160px] flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-400/25 hover:shadow-[0_28px_70px_-24px_rgba(99,102,241,0.35)] md:p-7">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300/90">
                  <svg className="h-6 w-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="h-10 w-24 rounded-lg bg-white/10" />
                  <div className="h-4 w-36 rounded bg-white/5" />
                </div>
              ) : (
                <>
                  <p className="text-4xl font-bold tabular-nums tracking-tight text-white md:text-[2.75rem] md:leading-none">
                    {stats.activeListings}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/50">Anunțuri active</p>
                  <p className="mt-4 text-xs font-medium text-violet-300/80 opacity-0 transition group-hover:opacity-100">
                    Gestionează →
                  </p>
                </>
              )}
            </div>
          </Link>

          <div className="flex h-full min-h-[160px] flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 md:p-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300/80">
              <svg className="h-6 w-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="h-10 w-32 rounded-lg bg-white/10" />
                <div className="h-4 w-36 rounded bg-white/5" />
              </div>
            ) : (
              <>
                <p className="text-4xl font-bold tabular-nums tracking-tight text-white md:text-[2.75rem] md:leading-none">
                  {stats.totalViews.toLocaleString("ro-RO")}
                </p>
                <p className="mt-2 text-sm font-medium text-white/50">Vizualizări totale</p>
              </>
            )}
          </div>

          <Link href="/dashboard/messages" className="group block h-full">
            <div className="relative flex h-full min-h-[160px] flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-0.5 hover:border-fuchsia-400/25 hover:shadow-[0_28px_70px_-24px_rgba(192,38,211,0.25)] md:p-7">
              <div className="mb-4 flex items-start justify-between">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300/85">
                  <svg className="h-6 w-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  {!statsLoading && stats.messages > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                      {stats.messages > 9 ? "9+" : stats.messages}
                    </span>
                  )}
                </div>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-16 rounded-lg bg-white/10" />
                  <div className="h-4 w-28 rounded bg-white/5" />
                </div>
              ) : (
                <>
                  <p className="text-4xl font-bold tabular-nums tracking-tight text-white md:text-[2.75rem] md:leading-none">
                    {stats.messages}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/50">Mesaje</p>
                  <p className="mt-1 text-xs text-white/35">
                    {stats.messages === 1
                      ? "1 necitit"
                      : stats.messages > 1
                        ? `${stats.messages} necitite`
                        : "Niciun mesaj nou"}
                  </p>
                  <p className="mt-3 text-xs font-medium text-fuchsia-300/80 opacity-0 transition group-hover:opacity-100">
                    Deschide inbox →
                  </p>
                </>
              )}
            </div>
          </Link>

          <Link href="/dashboard/favorites" className="group block h-full">
            <div className="flex h-full min-h-[160px] flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-0.5 hover:border-rose-400/25 md:p-7">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300/85">
                <svg className="h-6 w-6 opacity-90" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-16 rounded-lg bg-white/10" />
                  <div className="h-4 w-32 rounded bg-white/5" />
                </div>
              ) : (
                <>
                  <p className="text-4xl font-bold tabular-nums tracking-tight text-white md:text-[2.75rem] md:leading-none">
                    {stats.favorites}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/50">Favorite</p>
                  <p className="mt-4 text-xs font-medium text-rose-300/80 opacity-0 transition group-hover:opacity-100">
                    Vezi colecția →
                  </p>
                </>
              )}
            </div>
          </Link>
        </section>

        {/* Analytics */}
        <section className="mb-8 lg:mb-10">
          <ViewsLast7DaysChart
            data={stats.viewsLast7Days}
            totalViewsHint={stats.totalViews}
          />
        </section>

        {/* Quick actions */}
        <section className="mb-10 md:mb-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-8">
            <h3 className="text-lg font-semibold text-white md:text-xl">Acțiuni rapide</h3>
            <p className="mt-1 text-sm text-white/45">
              Publică sau actualizează anunțurile în câteva secunde.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Link href="/listings/new" className="flex-1">
                <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110 md:py-5 md:text-lg">
                  <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adaugă anunț
                </span>
              </Link>
              <Link href="/dashboard/listings" className="flex-1">
                <span className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-base font-semibold text-white shadow-inner transition hover:border-white/25 hover:bg-white/[0.09] md:py-5 md:text-lg">
                  <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Gestionează anunțuri
                </span>
              </Link>
            </div>
            <div className="mt-5 text-center sm:text-left">
              <Link
                href="/dashboard/invoices"
                className="text-sm font-medium text-white/40 transition hover:text-white/70"
              >
                Facturi și plăți →
              </Link>
            </div>
          </div>
        </section>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <Tabs.List className="gap-2 rounded-2xl border border-white/10 bg-[#141824] p-2">
            <Tabs.Trigger value="overview" className="rounded-xl px-5 py-2.5 text-sm">
              Privire generala
            </Tabs.Trigger>
            <Tabs.Trigger value="listings" className="rounded-xl px-5 py-2.5 text-sm">
              Anunturile mele
            </Tabs.Trigger>
            <Tabs.Trigger value="activity" className="rounded-xl px-5 py-2.5 text-sm">
              Activitate
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="mt-8">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Card variant="elevated" className="border border-white/10 bg-[#141824]">
                <Card.Body className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Plan actual</h3>
                      <p className="text-sm text-slate-400">Statusul contului si optiuni de upgrade.</p>
                    </div>
                    <Badge variant={user.role === 'premium' ? 'warning' : 'primary'} className="w-fit">
                      {user.role === 'premium' ? 'Premium' : 'Gratuit'}
                    </Badge>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    {user.role === 'premium'
                      ? 'Ai acces la promovari prioritare si suport dedicat.'
                      : 'Treci la Premium pentru mai multa vizibilitate si beneficii.'}
                  </p>
                  {user.role !== 'premium' && (
                    <Link href="/dashboard/billing">
                      <Button variant="primary" size="sm">Upgrade la Premium</Button>
                    </Link>
                  )}
                </Card.Body>
              </Card>

              <Card variant="elevated" className="border border-white/10 bg-[#141824]">
                <Card.Body className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Beneficii active</h3>
                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Credite disponibile</span>
                      <span className="font-bold text-white">{user.creditsBalance ?? 0} RON</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Discount global</span>
                      <span className="font-bold text-white">{user.promotionDiscountPercent ?? 0}%</span>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-2">Promovari gratuite</div>
                      {(() => {
                        const promotions = user?.promotionBenefits?.promotions || {};
                        const entries = Object.entries(promotions).filter(([, value]: any) => {
                          const count = value?.count || 0;
                          const expiresAt = value?.expiresAt ? new Date(value.expiresAt).getTime() : null;
                          const isActive = !expiresAt || expiresAt > Date.now();
                          return count > 0 && isActive;
                        });

                        if (entries.length === 0) {
                          return <div className="text-slate-500">Nu ai promovari gratuite active.</div>;
                        }

                        return (
                          <ul className="space-y-1">
                            {entries.map(([type, value]: any) => (
                              <li key={type} className="flex items-center justify-between">
                                <span className="capitalize">{type}</span>
                                <span className="font-bold text-white">{value?.count || 0}x</span>
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Anunturile mele</h3>
                  <p className="text-slate-400">Vezi rapid anunturile active si performanta lor.</p>
                </div>
                <Link href="/dashboard/listings" className="text-sm font-semibold text-primary-400 transition hover:text-primary-300">
                  Vezi toate anunturile →
                </Link>
              </div>

              {listingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-32 rounded-2xl border border-white/10 bg-slate-900/50 animate-pulse" />
                  ))}
                </div>
              ) : listingsError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
                  {listingsError}
                </div>
              ) : recentListings.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center">
                  <div className="text-lg font-bold text-white mb-2">Nu ai anunturi active</div>
                  <p className="text-slate-400 mb-6">Publica primul anunt pentru a aparea aici.</p>
                  <Link href="/listings/new">
                    <Button variant="primary">Adauga anunt</Button>
                  </Link>
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
                      className="bg-gradient-to-b from-slate-900/80 to-slate-950/70 border border-white/10"
                    />
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="activity" className="mt-6">
            <Card variant="elevated">
              <Card.Body className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Activitate recentă</h3>
                <div className="space-y-4">
                  {recentListings.length > 0 ? (
                    <>
                      {recentListings.slice(0, 3).map((listing) => (
                        <div key={listing.id} className="flex items-center text-gray-300 hover:text-white transition-colors">
                          <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Ai publicat anunțul "{listing.title}"</span>
                        </div>
                      ))}
                      {stats.messages > 0 && (
                        <div className="flex items-center text-gray-300 hover:text-white transition-colors">
                          <svg className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          <span>Ai primit {stats.messages} {stats.messages === 1 ? 'mesaj nou' : 'mesaje noi'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nicio activitate recentă</p>
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
