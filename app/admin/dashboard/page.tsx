'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { fetchWithAuthRefresh, postJsonWithAuthRefresh, validateServerAuthSession } from "@/lib/admin-fetch";
import { isAdminStaffRole } from "@/lib/is-admin-staff-client";
import AdminAlertCenter from "@/app/components/admin/AdminAlertCenter";
import AdminCommandCenter from "@/app/components/admin/AdminCommandCenter";

type PromotionType = 'top' | 'urgent' | 'featured' | 'refresh';
type ApplyTo = 'all' | 'new' | 'active' | 'inactive';
type BulkSegment = 'active' | 'inactive' | 'banned' | 'new';
type BulkAction = 'deactivate' | 'activate' | 'grant_discount' | 'grant_free_promos';
type BroadcastSchedule = 'now' | 'later';

type Broadcast = {
  id: string;
  title: string;
  segment: string;
  status: string;
};

type FeatureFlag = {
  key: string;
  enabled: boolean;
};

type User = {
  id: string;
  email: string;
  role: string;
};

type DashboardStats = {
  activeListings: number;
  pendingListings: number;
  registeredUsers: number;
  reportsReceived: number;
};

function sumDailySeries(series: unknown): number {
  if (!Array.isArray(series)) return 0;
  return series.reduce((acc, row: { count?: number }) => {
    return acc + (typeof row?.count === 'number' ? row.count : 0);
  }, 0);
}

function formatMinorUnits(n: unknown): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data yet';
  return (n / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRate(n: unknown): string {
  if (n === null || n === undefined || typeof n !== 'number' || Number.isNaN(n)) {
    return 'No data yet';
  }
  return `${(n * 100).toFixed(2)}%`;
}

const SYSTEM_FLAG_KEYS = {
  registrations: 'registrations_enabled',
  newListings: 'listings_enabled',
  payments: 'payments_enabled',
  promotions: 'promotions_enabled',
  maintenanceMode: 'maintenance_mode',
} as const;

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [controlTab, setControlTab] = useState<'broadcast' | 'benefits' | 'system' | 'bulk'>('broadcast');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [broadcastForm, setBroadcastForm] = useState({
    title: 'Anunț important',
    message: 'Salut! Avem actualizări importante pe platformă.',
    channels: { email: true, inApp: true, sms: false },
    schedule: 'now' as BroadcastSchedule,
    scheduledAt: ''
  });
  const [benefitsForm, setBenefitsForm] = useState({
    globalDiscount: 10,
    freePromotions: 1,
    promotionType: 'top' as PromotionType,
    creditsBonus: 0,
    applyTo: 'all' as ApplyTo,
    expiryDays: 30
  });
  const [systemToggles, setSystemToggles] = useState({
    registrations: true,
    newListings: true,
    payments: true,
    promotions: true,
    maintenanceMode: false
  });
  const [bulkForm, setBulkForm] = useState({
    segment: 'active' as BulkSegment,
    action: 'deactivate' as BulkAction,
    percent: 10,
    freePromos: 1,
    promotionType: 'top' as PromotionType,
    expiryDays: 30
  });
  const [lastAction, setLastAction] = useState('Nicio acțiune recentă');
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeListings: 0,
    pendingListings: 0,
    registeredUsers: 0,
    reportsReceived: 0,
  });
  const [controlCenter, setControlCenter] = useState<Record<string, unknown> | null>(null);
  type LiveAnalyticsRow = {
    id: string;
    eventType: string;
    createdAt: string;
    listingId: string | null;
    listingTitle: string | null;
    userEmail: string | null;
    sessionIdPrefix: string | null;
  };
  const [liveAnalyticsEvents, setLiveAnalyticsEvents] = useState<LiveAnalyticsRow[]>([]);
  const [integrityBusy, setIntegrityBusy] = useState(false);
  const [integrityMessage, setIntegrityMessage] = useState<string | null>(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState<
    Array<{ id: string; action: string; createdAt: string; resource?: string }>
  >([]);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);

  // Broadcast confirmation modal
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [broadcastConfirmData, setBroadcastConfirmData] = useState<any>(null);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // SECURITY: authority is /api/users/me (cookies), not localStorage role
  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const session = await validateServerAuthSession();
        if (cancelled) return;
        if (!session.ok || !session.user) {
          router.push("/auth/login?redirect=/admin/dashboard");
          return;
        }
        if (!isAdminStaffRole(session.user.role)) {
          router.push("/");
          return;
        }
        setCurrentUser({
          id: session.user.id || "",
          email: session.user.email || "",
          role: String(session.user.role || ""),
        });
        setIsAuthorized(true);
        await loadAdminData();
      } catch (error) {
        console.error("Auth check error:", error);
        if (!cancelled) router.push("/auth/login");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const poll = async () => {
      try {
        const r = await fetchWithAuthRefresh('/api/admin/analytics/live?limit=40');
        if (r.ok) {
          const j = (await r.json()) as { success?: boolean; events?: LiveAnalyticsRow[] };
          if (j.success && Array.isArray(j.events)) setLiveAnalyticsEvents(j.events);
        }
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(poll, 45000);
    return () => window.clearInterval(id);
  }, [isAuthorized]);

  const loadAdminData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setDataRefreshing(true);
      setActionSuccess(null);
    }
    try {
      const [flagsRes, broadcastsRes, usersRes, pendingQueueRes, reportsRes, listingStatsRes, controlCenterRes] =
        await Promise.all([
        fetchWithAuthRefresh('/api/admin/feature-flags'),
        fetchWithAuthRefresh('/api/admin/broadcasts'),
        fetchWithAuthRefresh('/api/admin/users?limit=1'),
        fetchWithAuthRefresh('/api/admin/moderation/queue?status=pending'),
        fetchWithAuthRefresh('/api/admin/reports?status=pending'),
        fetchWithAuthRefresh('/api/admin/listings/stats'),
        fetchWithAuthRefresh('/api/admin/analytics/control-center'),
      ]);

      if (flagsRes.ok) {
        const flagsData = await flagsRes.json();
        const flags = (flagsData.flags || []) as FeatureFlag[];
        const flagMap = new Map(flags.map((flag) => [flag.key, flag.enabled]));
        setSystemToggles({
          registrations: (flagMap.get(SYSTEM_FLAG_KEYS.registrations) as boolean) ?? true,
          newListings: (flagMap.get(SYSTEM_FLAG_KEYS.newListings) as boolean) ?? true,
          payments: (flagMap.get(SYSTEM_FLAG_KEYS.payments) as boolean) ?? true,
          promotions: (flagMap.get(SYSTEM_FLAG_KEYS.promotions) as boolean) ?? true,
          maintenanceMode: (flagMap.get(SYSTEM_FLAG_KEYS.maintenanceMode) as boolean) ?? false,
        });
      }

      if (broadcastsRes.ok) {
        const broadcastsData = await broadcastsRes.json();
        setBroadcasts(broadcastsData.broadcasts || []);
      }

      const nextStats: DashboardStats = {
        activeListings: 0,
        pendingListings: 0,
        registeredUsers: 0,
        reportsReceived: 0,
      };

      let ccPayload: Record<string, unknown> | null = null;
      if (controlCenterRes.ok) {
        try {
          const raw = await controlCenterRes.json();
          if (raw && raw.success) {
            ccPayload = raw as Record<string, unknown>;
            const kpi = raw.kpi as Record<string, number> | undefined;
            if (kpi) {
              if (typeof kpi.activeListings === 'number') nextStats.activeListings = kpi.activeListings;
              if (typeof kpi.pendingListings === 'number') nextStats.pendingListings = kpi.pendingListings;
              if (typeof kpi.totalUsers === 'number') nextStats.registeredUsers = kpi.totalUsers;
              if (typeof kpi.reportsOpen === 'number') nextStats.reportsReceived = kpi.reportsOpen;
            }
            if (Array.isArray(raw.liveAnalyticsEvents)) {
              setLiveAnalyticsEvents(raw.liveAnalyticsEvents as LiveAnalyticsRow[]);
            }
          }
        } catch {
          ccPayload = null;
        }
      }

      if (!ccPayload) {
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          nextStats.registeredUsers = typeof usersData.total === 'number' ? usersData.total : 0;
        }

        if (pendingQueueRes.ok) {
          const pendingQueueData = await pendingQueueRes.json();
          nextStats.pendingListings =
            typeof pendingQueueData.total === 'number'
              ? pendingQueueData.total
              : Array.isArray(pendingQueueData.items)
                ? pendingQueueData.items.length
                : 0;
        }

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          nextStats.reportsReceived =
            typeof reportsData.total === 'number'
              ? reportsData.total
              : Array.isArray(reportsData.reports)
                ? reportsData.reports.length
                : 0;
        }

        if (listingStatsRes.ok) {
          const listingStatsData = await listingStatsRes.json();
          nextStats.activeListings =
            typeof listingStatsData.activeListings === 'number' ? listingStatsData.activeListings : 0;
        }
        setControlCenter(null);
        setLiveAnalyticsEvents([]);
      } else {
        setControlCenter(ccPayload);
      }

      try {
        const auditRes = await fetchWithAuthRefresh("/api/admin/audit-logs?limit=8");
        if (auditRes.ok) {
          const auditData = (await auditRes.json()) as {
            logs?: Array<{
              id: string;
              action: string;
              createdAt: string;
              resource?: string;
            }>;
          };
          setRecentAuditLogs(Array.isArray(auditData.logs) ? auditData.logs : []);
          setAuditLogsError(null);
        } else if (auditRes.status === 403) {
          setRecentAuditLogs([]);
          setAuditLogsError("Fără permisiune pentru jurnalul de audit.");
        } else {
          setRecentAuditLogs([]);
          setAuditLogsError("Jurnalul de audit nu a putut fi încărcat.");
        }
      } catch {
        setRecentAuditLogs([]);
        setAuditLogsError("Jurnalul de audit nu a putut fi încărcat.");
      }

      setStats(nextStats);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la încărcarea datelor');
    } finally {
      if (showRefreshing) setDataRefreshing(false);
    }
  };

  const handleBroadcast = async () => {
    // Validate before showing confirmation modal
    if (!broadcastForm.title || !broadcastForm.message) {
      setErrorMessage('⚠️ Te rog completează titlul și mesajul înainte de a trimite.');
      return;
    }
    
    // Reset states and show confirmation modal with data
    setErrorMessage('');
    setBroadcastSuccess(false);
    setBroadcastConfirmData({
      title: broadcastForm.title,
      message: broadcastForm.message,
      channels: broadcastForm.channels,
      schedule: broadcastForm.schedule,
      scheduledAt: broadcastForm.scheduledAt,
    });
    setShowBroadcastConfirm(true);
  };

  const sendBroadcastConfirmed = async () => {
    try {
      console.log('🚀 Starting broadcast send...');
      console.log('📋 Broadcast data:', broadcastConfirmData);
      
      // Explicit validation before sending
      if (!broadcastConfirmData?.title || !broadcastConfirmData?.message) {
        const errorMsg = '⚠️ Titlul și mesajul sunt obligatorii. Te rog completează ambele câmpuri.';
        console.error('❌ Validation failed:', { title: broadcastConfirmData?.title, message: broadcastConfirmData?.message });
        setErrorMessage(errorMsg);
        return;
      }
      
      setBroadcastSending(true);
      setErrorMessage('');

      const payload = {
        title: broadcastConfirmData.title,
        message: broadcastConfirmData.message,
        channels: broadcastConfirmData.channels,
        segment: 'all',
        schedule: broadcastConfirmData.schedule,
        scheduledAt: broadcastConfirmData.scheduledAt,
      };

      const res = await postJsonWithAuthRefresh('/api/admin/broadcasts', payload);

      console.log('📥 Response status:', res.status);
      const data = await res.json();
      console.log('📊 Response data:', data);
      
      if (!res.ok) throw new Error(data.error || 'Eroare la trimiterea mesajului');

      const when = data.scheduled ? `Programat: ${broadcastConfirmData.scheduledAt}` : 'Trimis acum';
      setLastAction(`📨 Mesaj global: ${broadcastConfirmData.title} · ${when}`);

      const broadcastsRes = await fetchWithAuthRefresh('/api/admin/broadcasts');
      if (broadcastsRes.ok) {
        const broadcastsData = await broadcastsRes.json();
        setBroadcasts(broadcastsData.broadcasts || []);
      }

      console.log('✅ Broadcast sent successfully!');
      
      // Show success message in modal before closing
      setErrorMessage('');
      setBroadcastSuccess(true);
      setBroadcastSending(false);
      
      // Close modal and reset form after delay to show success
      setTimeout(() => {
        setShowBroadcastConfirm(false);
        setBroadcastConfirmData(null);
        setBroadcastSuccess(false);
        setBroadcastForm({
          title: '',
          message: '',
          channels: { email: true, inApp: true, sms: false },
          schedule: 'now' as BroadcastSchedule,
          scheduledAt: '',
        });
      }, 2500);
      
      return; // Exit early on success
    } catch (error: unknown) {
      console.error('❌ Broadcast error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Eroare la trimiterea mesajului';
      setErrorMessage(errorMsg);
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleApplyBenefits = async () => {
    try {
      setActionSuccess(null);
      setErrorMessage('');
      const res = await postJsonWithAuthRefresh('/api/admin/benefits', {
        globalDiscount: benefitsForm.globalDiscount,
        freePromotions: benefitsForm.freePromotions,
        promotionType: benefitsForm.promotionType,
        creditsBonus: benefitsForm.creditsBonus,
        applyTo: benefitsForm.applyTo,
        expiryDays: benefitsForm.expiryDays,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la aplicarea beneficiilor');

      setLastAction(
        `Beneficii globale: −${benefitsForm.globalDiscount}% · ${benefitsForm.freePromotions}×${benefitsForm.promotionType} · ${benefitsForm.creditsBonus} credite`
      );
      setActionSuccess(
        `Beneficii aplicate pentru ${typeof data.updated === 'number' ? data.updated : '—'} utilizatori.`
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la aplicarea beneficiilor');
    }
  };

  const handleBulkAction = async () => {
    try {
      setActionSuccess(null);
      setErrorMessage('');
      const res = await postJsonWithAuthRefresh('/api/admin/bulk-users', {
        segment: bulkForm.segment,
        action: bulkForm.action,
        percent: bulkForm.percent,
        freePromos: bulkForm.freePromos,
        promotionType: bulkForm.promotionType,
        expiryDays: bulkForm.expiryDays,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la bulk action');

      setLastAction(`Bulk: ${bulkForm.action} · segment ${bulkForm.segment}`);
      setActionSuccess(
        `Acțiune în masă: ${typeof data.updated === 'number' ? data.updated : '—'} utilizatori actualizați.`
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la bulk action');
    }
  };

  const runIntegrityCleanup = async () => {
    setIntegrityMessage(null);
    setIntegrityBusy(true);
    try {
      const res = await postJsonWithAuthRefresh('/api/admin/analytics/integrity', {});
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Eroare cleanup');
      setIntegrityMessage(
        `Șterse evenimente orfane: listing ${data.deleted?.orphanListingRefs ?? 0}, user ${data.deleted?.orphanUserRefs ?? 0}, sesiune ${data.deleted?.orphanSessionRefs ?? 0}.`
      );
      await loadAdminData(true);
    } catch (e: unknown) {
      setIntegrityMessage(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setIntegrityBusy(false);
    }
  };

  const toggleSystem = async (key: keyof typeof systemToggles) => {
    const newValue = !systemToggles[key];
    setSystemToggles({ ...systemToggles, [key]: newValue });

    try {
      setErrorMessage('');
      const res = await postJsonWithAuthRefresh('/api/admin/feature-flags', {
        key: SYSTEM_FLAG_KEYS[key],
        enabled: newValue,
        description: `System toggle: ${key}`,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la actualizarea setărilor');

      setLastAction(`⚙️ Sistem: ${key} -> ${newValue ? 'Activat' : 'Dezactivat'}`);
    } catch (error: unknown) {
      setSystemToggles({ ...systemToggles, [key]: !newValue });
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la actualizarea setărilor');
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] pb-10 pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(38rem,58vh)] max-h-[520px] bg-[radial-gradient(ellipse_72%_52%_at_50%_-4%,rgba(255,90,0,0.10),transparent_55%),radial-gradient(ellipse_46%_36%_at_88%_10%,rgba(124,92,246,0.15),transparent_50%)]"
        />
        {/* SECURITY: Loading state while checking authentication */}
        {isLoading && !isAuthorized && (
          <div className="relative max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
                  aria-hidden
                />
                <p className="text-[var(--text-tertiary)] text-sm">Verificare acces admin…</p>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY: Only render admin panel if authorized */}
        {isAuthorized && !isLoading && (
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Operațiuni
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Admin Dashboard
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-[var(--text-tertiary)]">
                Gestionare platformă, metrici operaționale și control global al sistemului.
              </p>
              <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-[var(--bg-elevated)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.5)]" aria-hidden />
                <span>
                  Sesiune: <strong className="text-[var(--text-primary)] font-medium">{currentUser?.email}</strong>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadAdminData(true)}
                disabled={dataRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-[border-color,color,opacity] duration-200 ease-out hover:border-[var(--border-focus)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {dataRefreshing ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-[var(--accent-primary)]" />
                ) : (
                  <svg className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Reîmprospătare date
              </button>
            </div>
          </header>

          <AdminCommandCenter stats={stats} />

          <div className="mb-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-1 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.65)] ring-1 ring-inset ring-white/[0.04]">
            <AdminAlertCenter />
          </div>

          {actionSuccess && (
            <div className="mb-5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[13px] text-emerald-200/95">
              {actionSuccess}
            </div>
          )}

          {/* KPI */}
          <div
            id="admin-kpi-section"
            className="mb-7 grid grid-cols-2 gap-2.5 scroll-mt-24 md:grid-cols-4 sm:gap-3"
          >
            <div className="rounded-xl border border-white/[0.09] border-t-2 border-t-emerald-500/50 bg-gradient-to-b from-emerald-500/[0.07] to-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow] duration-200 ease-out hover:border-white/[0.14] sm:p-4">
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Anunțuri active
                </span>
                <span className="rounded bg-emerald-500/18 px-1.5 py-px text-[9px] font-semibold text-emerald-200/95">
                  Live
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                {stats.activeListings}
              </p>
              <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-emerald-400/75 transition-[width] duration-500 ease-out"
                  style={{ width: stats.activeListings > 0 ? '100%' : '8%' }}
                />
              </div>
            </div>

            <Link
              href="/admin/seo"
              className="block rounded-xl border border-white/[0.09] border-t-2 border-t-cyan-500/40 bg-gradient-to-b from-cyan-500/[0.07] to-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow] duration-200 ease-out hover:border-[var(--border-focus)] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  SEO
                </span>
                <span className="rounded bg-cyan-500/18 px-1.5 py-px text-[9px] font-semibold text-cyan-200/95">
                  Status
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Discovery &amp; sitemaps</p>
              <p className="mt-1 text-[10px] font-medium text-[var(--accent-secondary)]/90">Deschide panoul SEO →</p>
            </Link>

            <Link
              href="/admin/moderation?tab=pending"
              className="block rounded-xl border border-white/[0.09] border-t-2 border-t-amber-500/50 bg-gradient-to-b from-amber-500/[0.07] to-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow] duration-200 ease-out hover:border-[var(--border-focus)] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  În așteptare
                </span>
                <span className="rounded bg-amber-500/18 px-1.5 py-px text-[9px] font-semibold text-amber-200/95">
                  Coadă
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                {stats.pendingListings}
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--accent-secondary)]/90">Deschide moderarea →</p>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-amber-400/75 transition-[width] duration-500 ease-out"
                  style={{ width: stats.pendingListings > 0 ? '100%' : '8%' }}
                />
              </div>
            </Link>

            <Link
              href="/admin/moderation?tab=users"
              className="block rounded-xl border border-white/[0.09] border-t-2 border-t-[var(--accent-primary)]/70 bg-gradient-to-b from-[var(--accent-primary)]/[0.08] to-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow] duration-200 ease-out hover:border-[var(--border-focus)] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Utilizatori
                </span>
                <span className="rounded bg-[var(--accent-primary)]/22 px-1.5 py-px text-[9px] font-semibold text-[var(--text-secondary)]">
                  Total
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                {stats.registeredUsers}
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--text-tertiary)]">Listă utilizatori →</p>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)]/55 transition-[width] duration-500 ease-out"
                  style={{ width: stats.registeredUsers > 0 ? '100%' : '8%' }}
                />
              </div>
            </Link>

            <div className="rounded-xl border border-white/[0.09] border-t-2 border-t-red-500/45 bg-gradient-to-b from-red-500/[0.06] to-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow] duration-200 ease-out hover:border-white/[0.14] sm:p-4">
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Raportări deschise
                </span>
                <span className="rounded bg-red-500/18 px-1.5 py-px text-[9px] font-semibold text-red-200/95">
                  Prioritate
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                {stats.reportsReceived}
              </p>
              <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-red-400/70 transition-[width] duration-500 ease-out"
                  style={{ width: stats.reportsReceived > 0 ? '100%' : '8%' }}
                />
              </div>
            </div>
          </div>

          {controlCenter && (() => {
            const cc = controlCenter;
            type TrendBucket = {
              messages?: Array<{ count?: number }>;
              listingViews?: Array<{ count?: number }>;
              listingsCreated?: Array<{ count?: number }>;
              usersRegistered?: Array<{ count?: number }>;
            };
            const trendsRoot = cc.trends as
              | { last7Days?: TrendBucket; last30Days?: TrendBucket }
              | undefined;
            const trends7d = trendsRoot?.last7Days;
            const trends30 = trendsRoot?.last30Days;
            const sessions7 = (cc.sessions as { last7Days?: Record<string, unknown> } | undefined)?.last7Days;
            const sessions30 = (cc.sessions as { last30Days?: Record<string, unknown> } | undefined)?.last30Days;
            const funnel = cc.funnel as Record<string, unknown> | undefined;
            const ev = funnel?.eventTotalsLast30d as Record<string, unknown> | undefined;
            const sessF = funnel?.sessionBasedLast30d as Record<string, unknown> | undefined;
            const top = cc.top as Record<string, unknown> | undefined;
            const mod = cc.moderation as Record<string, unknown> | undefined;
            const susp = cc.suspicious as Record<string, unknown> | undefined;
            const rev = cc.revenue as Record<string, unknown> | undefined;
            const kpi = cc.kpi as Record<string, unknown> | undefined;
            const hasEv = (cc.dataAvailability as { hasAnalyticsEvents?: boolean } | undefined)?.hasAnalyticsEvents;
            const alerts = cc.alerts as
              | Array<{
                  id: string;
                  severity: string;
                  kind: string;
                  message: string;
                  metric: string;
                  current: number;
                  baseline: number;
                }>
              | undefined;
            const validation = cc.validation as
              | {
                  thresholdPercent?: number;
                  anyExceeded?: boolean;
                  checks?: Array<{
                    name: string;
                    dbCount: number;
                    eventCount: number;
                    discrepancyPercent: number | null;
                    exceedsThreshold: boolean;
                  }>;
                }
              | undefined;
            const integrity = cc.integrity as
              | {
                  orphanListingRefs?: number;
                  orphanUserRefs?: number;
                  orphanSessionRefs?: number;
                }
              | undefined;
            const revenueUnified = cc.revenueUnified as
              | Array<{
                  paymentId: string;
                  amountMinorUnits: number;
                  currency: string;
                  paidAt: string | null;
                  purpose: string;
                  payerEmail: string | null;
                  listingId: string | null;
                  listingTitle: string | null;
                  listingPromotionActive: boolean | null;
                }>
              | undefined;
            return (
            <section className="mb-7 rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-5 shadow-[var(--shadow-md)] ring-1 ring-inset ring-white/[0.02] sm:p-6">
              <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                Control center — metrici reale
              </h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-snug text-[var(--text-muted)]">
                Agregări Prisma + <span className="font-mono">analytics_events</span>,{' '}
                <span className="font-mono">analytics_sessions</span>, plăți și{' '}
                <span className="font-mono">audit_logs</span>. Fără valori estimate.
              </p>
              {hasEv === false && (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/95">
                  Nu există încă evenimente în <span className="font-mono">analytics_events</span>. Funnel-ul și
                  sesiunile bazate pe evenimente vor afișa „No data yet” până la primul tracking.
                </p>
              )}

              <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Mesaje trimise (24h)', val: typeof kpi?.messagesSent24h === 'number' ? kpi.messagesSent24h : 'No data yet' },
                  { label: 'Venit azi (RON)', val: formatMinorUnits(kpi?.revenueTodayMinorUnits) },
                  { label: 'Venit 7z (RON)', val: formatMinorUnits(kpi?.revenue7dMinorUnits) },
                  { label: 'Venit 30z (RON)', val: formatMinorUnits(kpi?.revenue30dMinorUnits) },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/50 px-3 py-2.5"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {x.label}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                      {x.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Mesaje (7z, DB)', val: sumDailySeries(trends7d?.messages) },
                  { label: 'Mesaje (30z, DB)', val: sumDailySeries(trends30?.messages) },
                  { label: 'Vizualizări eveniment (7z)', val: sumDailySeries(trends7d?.listingViews) },
                  { label: 'Vizualizări eveniment (30z)', val: sumDailySeries(trends30?.listingViews) },
                  { label: 'Anunțuri create (7z)', val: sumDailySeries(trends7d?.listingsCreated) },
                  { label: 'Utilizatori noi (7z)', val: sumDailySeries(trends7d?.usersRegistered) },
                  { label: 'Anunțuri create (30z)', val: sumDailySeries(trends30?.listingsCreated) },
                  { label: 'Utilizatori noi (30z)', val: sumDailySeries(trends30?.usersRegistered) },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/50 px-3 py-2.5"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {x.label}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                      {x.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Sesiuni (7z)</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Sesiuni cu evenimente:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof sessions7?.sessionsWithEvents === 'number' ? sessions7.sessionsWithEvents : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Medie evenimente/sesiune:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {sessions7?.avgEventsPerSession != null && typeof sessions7.avgEventsPerSession === 'number'
                          ? sessions7.avgEventsPerSession.toFixed(2)
                          : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Rată bounce (1 eveniment):{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatRate(sessions7?.bounceRate as number | null | undefined)}
                      </span>
                    </li>
                    <li>
                      Durată medie (s):{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {sessions7?.avgDurationSeconds != null && typeof sessions7.avgDurationSeconds === 'number'
                          ? Math.round(sessions7.avgDurationSeconds).toString()
                          : 'No data yet'}
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Sesiuni (30z)</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Sesiuni cu evenimente:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof sessions30?.sessionsWithEvents === 'number' ? sessions30.sessionsWithEvents : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Medie evenimente/sesiune:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {sessions30?.avgEventsPerSession != null && typeof sessions30.avgEventsPerSession === 'number'
                          ? sessions30.avgEventsPerSession.toFixed(2)
                          : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Rată bounce:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatRate(sessions30?.bounceRate as number | null | undefined)}
                      </span>
                    </li>
                    <li>
                      Durată medie (s):{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {sessions30?.avgDurationSeconds != null && typeof sessions30.avgDurationSeconds === 'number'
                          ? Math.round(sessions30.avgDurationSeconds).toString()
                          : 'No data yet'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Funnel evenimente (30z)</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Vizualizări:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof ev?.listingViews === 'number' ? ev.listingViews : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Click contact:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof ev?.listingContactClicks === 'number' ? ev.listingContactClicks : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Mesaje:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof ev?.messagesSent === 'number' ? ev.messagesSent : 'No data yet'}
                      </span>
                    </li>
                    <li>Viz → contact: <span className="font-mono text-[var(--text-primary)]">{formatRate(ev?.viewToContactRate as number | undefined)}</span></li>
                    <li>Viz → mesaj: <span className="font-mono text-[var(--text-primary)]">{formatRate(ev?.viewToMessageRate as number | undefined)}</span></li>
                    <li>Contact → mesaj: <span className="font-mono text-[var(--text-primary)]">{formatRate(ev?.contactToMessageRate as number | undefined)}</span></li>
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Funnel pe sesiune (30z)</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Sesiuni cu listing_view:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof sessF?.sessionsWithListingView === 'number' ? sessF.sessionsWithListingView : 'No data yet'}
                      </span>
                    </li>
                    <li>Viz → contact (sesiune): <span className="font-mono text-[var(--text-primary)]">{formatRate(sessF?.sessionViewToContactRate as number | undefined)}</span></li>
                    <li>Viz → mesaj (sesiune): <span className="font-mono text-[var(--text-primary)]">{formatRate(sessF?.sessionViewToMessageRate as number | undefined)}</span></li>
                    <li>Contact → mesaj (sesiune): <span className="font-mono text-[var(--text-primary)]">{formatRate(sessF?.sessionContactToMessageRate as number | undefined)}</span></li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Top anunțuri după conversie (30z)</h3>
                  <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-[12px] text-[var(--text-tertiary)]">
                    {Array.isArray(funnel?.topListingsByConversion) && (funnel.topListingsByConversion as unknown[]).length > 0 ? (
                      (funnel.topListingsByConversion as Array<{ listingId: string; title: string | null; contactPerView: number | null }>).map((r) => (
                        <li key={r.listingId} className="flex justify-between gap-2">
                          <Link href={`/listings/${r.listingId}`} className="truncate text-[var(--accent-secondary)] hover:underline">
                            {r.title || r.listingId}
                          </Link>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">
                            {r.contactPerView != null ? `${(r.contactPerView * 100).toFixed(1)}% clicks/viz` : 'No data yet'}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Funnel pe categorie (30z)</h3>
                  <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-[11px] text-[var(--text-tertiary)]">
                    {Array.isArray(funnel?.byCategoryLast30d) && (funnel.byCategoryLast30d as unknown[]).length > 0 ? (
                      (funnel.byCategoryLast30d as Array<{ category: string; viewToContactRate: number | null }>).map((r) => (
                        <li key={r.category} className="flex justify-between gap-2">
                          <span className="truncate">{r.category}</span>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">{formatRate(r.viewToContactRate)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Top anunțuri (vizualizări DB)</h3>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[12px] text-[var(--text-tertiary)]">
                    {Array.isArray(top?.listingsByViews) && (top.listingsByViews as unknown[]).length > 0 ? (
                      (top.listingsByViews as Array<{ id: string; title: string; views: number }>).map((r) => (
                        <li key={r.id} className="flex justify-between gap-2">
                          <Link href={`/listings/${r.id}`} className="truncate text-[var(--accent-secondary)] hover:underline">
                            {r.title}
                          </Link>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">{r.views}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Top utilizatori (evenimente 30z)</h3>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[12px] text-[var(--text-tertiary)]">
                    {Array.isArray(top?.usersByEventCount) && (top.usersByEventCount as unknown[]).length > 0 ? (
                      (top.usersByEventCount as Array<{ userId: string; eventCount: number; email: string | null }>).map((r) => (
                        <li key={r.userId} className="flex justify-between gap-2">
                          <span className="truncate">{r.email || r.userId}</span>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">{r.eventCount}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Top categorii (engagement evenimente)</h3>
                  <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[12px] text-[var(--text-tertiary)]">
                    {Array.isArray(top?.categoriesByEngagement) && (top.categoriesByEngagement as unknown[]).length > 0 ? (
                      (top.categoriesByEngagement as Array<{ category: string; eventCount: number }>).map((r) => (
                        <li key={r.category} className="flex justify-between gap-2">
                          <span className="truncate">{r.category}</span>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">{r.eventCount}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Moderare & rapoarte</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Anunțuri în așteptare (status):{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof mod?.pendingListings === 'number' ? mod.pendingListings : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Coadă moderare:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof mod?.moderationQueuePending === 'number' ? mod.moderationQueuePending : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Respinse azi:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof mod?.rejectedToday === 'number' ? mod.rejectedToday : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Aprobate azi:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof mod?.approvedToday === 'number' ? mod.approvedToday : 'No data yet'}
                      </span>
                    </li>
                  </ul>
                  <ul className="mt-2 border-t border-white/[0.06] pt-2 space-y-1 text-[11px] text-[var(--text-tertiary)]">
                    {Array.isArray(mod?.reportsByStatus) && (mod.reportsByStatus as Array<{ status: string; count: number }>).length > 0 ? (
                      (mod.reportsByStatus as Array<{ status: string; count: number }>).map((r) => (
                        <li key={r.status}>
                          Rapoarte · {r.status}:{' '}
                          <span className="font-mono text-[var(--text-primary)]">{r.count}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Activitate suspectă</h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">Scor de risc din semnale reale (volum, rapoarte, IP partajat, cont).</p>
                  <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-[11px] text-[var(--text-tertiary)]">
                    {Array.isArray(susp?.riskUsers) && (susp.riskUsers as unknown[]).length > 0 ? (
                      (susp.riskUsers as Array<{ userId: string; email: string | null; riskScore: number; riskLevel: string; signals: string[] }>).map((u) => (
                        <li key={u.userId} className="border-b border-white/[0.04] pb-1">
                          <span className="font-mono text-[var(--text-primary)]">{u.email || u.userId}</span> ·{' '}
                          {u.riskLevel} · {u.riskScore}
                          <span className="block text-[10px] text-[var(--text-muted)]">{u.signals.join(', ')}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Venit & promovări</h3>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>Medie / utilizator plătitor (30z): <span className="font-mono text-[var(--text-primary)]">{formatMinorUnits(rev?.avgPerPayingUserLast30dMinorUnits as number | undefined)}</span></li>
                    <li>Utilizatori plătitori distincți (30z): <span className="font-mono text-[var(--text-primary)]">{typeof rev?.distinctPayingUsersLast30d === 'number' ? rev.distinctPayingUsersLast30d : 'No data yet'}</span></li>
                    <li>Promovări active (anunțuri): <span className="font-mono text-[var(--text-primary)]">{typeof rev?.activePromotedListings === 'number' ? rev.activePromotedListings : 'No data yet'}</span></li>
                    <li>Cumpărători promoții (30z): <span className="font-mono text-[var(--text-primary)]">{typeof rev?.promotionBuyersLast30d === 'number' ? rev.promotionBuyersLast30d : 'No data yet'}</span></li>
                    <li>Conversie plată din vizualizări autentificate (30z): <span className="font-mono text-[var(--text-primary)]">{formatRate(rev?.promotionBuyerToViewerRate30d as number | undefined)}</span></li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Alerte automate</h3>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Detectate din compararea ferestrelor de timp reale (fără praguri inventate în UI).
                </p>
                <ul className="mt-2 space-y-2 text-[12px] text-[var(--text-tertiary)]">
                  {Array.isArray(alerts) && alerts.length > 0 ? (
                    alerts.map((a) => (
                      <li
                        key={a.id}
                        className={`rounded-md border px-2.5 py-2 ${
                          a.severity === 'critical'
                            ? 'border-red-500/35 bg-red-500/10'
                            : a.severity === 'warning'
                              ? 'border-amber-500/35 bg-amber-500/10'
                              : 'border-blue-500/30 bg-blue-500/[0.07]'
                        }`}
                      >
                        <span className="font-medium text-[var(--text-primary)]">[{a.kind}]</span> {a.message}
                        <span className="mt-1 block font-mono text-[10px] text-[var(--text-muted)]">
                          {a.metric}: curent {a.current} · referință {a.baseline}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[var(--text-muted)]">No data yet</li>
                  )}
                </ul>
              </div>

              <div className="mt-4 rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Validare metrici (DB vs evenimente)</h3>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Prag discrepanță: {typeof validation?.thresholdPercent === 'number' ? validation.thresholdPercent : '—'}%. Depășirile sunt înregistrate și în jurnalul serverului.
                </p>
                {validation?.anyExceeded ? (
                  <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100/95">
                    Există discrepanțe peste prag — verifică pipeline-ul de tracking sau întârzieri de scriere.
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--text-tertiary)]">
                  {Array.isArray(validation?.checks) && validation.checks.length > 0 ? (
                    validation.checks.map((c) => (
                      <li
                        key={c.name}
                        className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.04] pb-1 ${c.exceedsThreshold ? 'text-amber-200/95' : ''}`}
                      >
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{c.name}</span>
                        <span>
                          DB <span className="font-mono text-[var(--text-primary)]">{c.dbCount}</span> · ev{' '}
                          <span className="font-mono text-[var(--text-primary)]">{c.eventCount}</span>
                          {c.discrepancyPercent != null ? (
                            <>
                              {' '}
                              · Δ{' '}
                              <span className="font-mono">{c.discrepancyPercent.toFixed(1)}%</span>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[var(--text-muted)]">No data yet</li>
                  )}
                </ul>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Live activity (evenimente)</h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">Actualizare la ~45s; date din analytics_events.</p>
                  <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-[10px] text-[var(--text-tertiary)]">
                    {liveAnalyticsEvents.length > 0 ? (
                      liveAnalyticsEvents.map((e) => (
                        <li key={e.id} className="border-b border-white/[0.04] pb-1 font-mono">
                          <span className="text-[var(--text-muted)]">
                            {new Date(e.createdAt).toLocaleTimeString('ro-RO')}
                          </span>{' '}
                          <span className="text-[var(--text-primary)]">{e.eventType}</span>
                          {e.listingTitle ? (
                            <span className="block truncate text-[var(--text-secondary)]">{e.listingTitle}</span>
                          ) : null}
                          {e.userEmail ? <span className="text-[var(--text-muted)]">{e.userEmail}</span> : null}
                        </li>
                      ))
                    ) : (
                      <li className="text-[var(--text-muted)]">No data yet</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] p-4">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Integritate date (orfani)</h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Evenimente care referă înregistrări șterse. Curățarea este înregistrată în audit (înainte/după).
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-tertiary)]">
                    <li>
                      Listing lipsă:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof integrity?.orphanListingRefs === 'number' ? integrity.orphanListingRefs : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      User lipsă:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof integrity?.orphanUserRefs === 'number' ? integrity.orphanUserRefs : 'No data yet'}
                      </span>
                    </li>
                    <li>
                      Sesiune lipsă:{' '}
                      <span className="font-mono text-[var(--text-primary)]">
                        {typeof integrity?.orphanSessionRefs === 'number' ? integrity.orphanSessionRefs : 'No data yet'}
                      </span>
                    </li>
                  </ul>
                  {integrityMessage ? (
                    <p className="mt-2 rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100/95">
                      {integrityMessage}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={
                      integrityBusy ||
                      !integrity ||
                      ((integrity.orphanListingRefs ?? 0) === 0 &&
                        (integrity.orphanUserRefs ?? 0) === 0 &&
                        (integrity.orphanSessionRefs ?? 0) === 0)
                    }
                    onClick={() => void runIntegrityCleanup()}
                    className="mt-3 w-full rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-rose-500/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {integrityBusy ? 'Se curăță…' : 'Curăță evenimente orfane'}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Venit unificat (plăți → promovări)</h3>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Plăți reușite cu scop promovare, legate de anunț prin metadata.
                </p>
                <div className="mt-2 max-h-48 overflow-x-auto overflow-y-auto text-[10px]">
                  <table className="w-full border-collapse text-left text-[var(--text-tertiary)]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[9px] uppercase text-[var(--text-muted)]">
                        <th className="py-1 pr-2">Plată</th>
                        <th className="py-1 pr-2">Sumă</th>
                        <th className="py-1 pr-2">Anunț</th>
                        <th className="py-1">Promo activ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(revenueUnified) && revenueUnified.length > 0 ? (
                        revenueUnified.map((row) => (
                          <tr key={row.paymentId} className="border-b border-white/[0.04]">
                            <td className="py-1 pr-2 font-mono text-[var(--text-muted)]">{row.paymentId.slice(0, 8)}…</td>
                            <td className="py-1 pr-2 font-mono text-[var(--text-primary)]">
                              {(row.amountMinorUnits / 100).toLocaleString('ro-RO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              {row.currency}
                            </td>
                            <td className="py-1 pr-2">
                              {row.listingTitle ?? (row.listingId ? row.listingId.slice(0, 8) + '…' : 'No data yet')}
                            </td>
                            <td className="py-1">
                              {row.listingPromotionActive === null
                                ? 'No data yet'
                                : row.listingPromotionActive
                                  ? 'Da'
                                  : 'Nu'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-[var(--text-muted)]">
                            No data yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/[0.07] bg-[var(--bg-primary)]/40 p-4">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Activity feed (audit)</h3>
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-[11px] text-[var(--text-tertiary)]">
                  {Array.isArray(cc.activityFeed) && (cc.activityFeed as unknown[]).length > 0 ? (
                    (cc.activityFeed as Array<{ id: string; createdAt: string; action: string; resource: string; userEmail: string | null }>).map((log) => (
                      <li key={log.id} className="border-b border-white/[0.04] pb-1">
                        <span className="font-mono text-[var(--text-muted)]">
                          {new Date(log.createdAt).toLocaleString('ro-RO')}
                        </span>{' '}
                        <span className="text-[var(--text-primary)]">{log.action}</span> · {log.resource}
                        {log.userEmail ? (
                          <>
                            {' '}
                            · <span className="text-[var(--text-secondary)]">{log.userEmail}</span>
                          </>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="text-[var(--text-muted)]">No data yet</li>
                  )}
                </ul>
              </div>
            </section>
            );
          })()}

          {/* Scope */}
          <section className="mb-7 rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-5 shadow-[var(--shadow-md)] ring-1 ring-inset ring-white/[0.02] sm:p-6">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
              Domeniu de control
            </h2>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-snug text-[var(--text-tertiary)]">
              Ești conectat ca administrator cu drepturi complete: parametri platformă, utilizatori, anunțuri și
              comutatoare de sistem. Modificările sunt înregistrate și propagate conform politicilor API.
            </p>
            <div className="mt-4 grid gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { t: 'Moderare', d: 'Coadă, utilizatori, conținut', c: 'border-emerald-500/20 bg-emerald-500/[0.06]' },
                { t: 'Promovări', d: 'Pachete și vizibilitate', c: 'border-amber-500/20 bg-amber-500/[0.06]' },
                { t: 'Finanțe', d: 'Facturi și conformitate', c: 'border-rose-500/20 bg-rose-500/[0.06]' },
                { t: 'Sistem', d: 'Feature flags și stabilitate', c: 'border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/[0.07]' },
              ].map((x) => (
                <div
                  key={x.t}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-[border-color] duration-200 ${x.c}`}
                >
                  <span className="mt-px text-[11px] text-emerald-400/90" aria-hidden>
                    ✓
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-tight text-[var(--text-primary)]">{x.t}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Command Center — operațiuni globale (broadcast, beneficii, bulk) */}
          <div
            id="admin-global-ops"
            className="scroll-mt-24 overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 shadow-[var(--shadow-lg)] ring-1 ring-inset ring-white/[0.02]"
          >
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Command center
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Operațiuni globale
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-[var(--text-tertiary)]">
                    Broadcast, beneficii, comutatoare sistem și acțiuni în masă — cu confirmare și urmă în jurnal.
                  </p>
                </div>
                <div className="w-full max-w-md shrink-0 rounded-lg border border-white/[0.08] bg-[var(--bg-primary)]/80 px-3 py-2.5 text-[var(--text-tertiary)] ring-1 ring-inset ring-white/[0.03]">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Ultima acțiune
                  </span>
                  <p className="mt-0.5 break-words text-[12px] font-medium leading-snug text-[var(--text-secondary)]">
                    {lastAction}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap gap-1.5 border-b border-white/[0.06] bg-[var(--bg-primary)]/35 px-4 py-2 sm:px-6"
              role="tablist"
              aria-label="Secțiuni command center"
            >
              {(
                [
                  ['broadcast', 'Broadcast', '📣'],
                  ['benefits', 'Beneficii', '🎁'],
                  ['system', 'Sistem', '⚙️'],
                  ['bulk', 'Bulk', '🧩'],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={controlTab === id}
                  onClick={() => setControlTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-[background,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                    controlTab === id
                      ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)] ring-1 ring-white/[0.06]'
                      : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span aria-hidden className="text-[13px] opacity-90">
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div className="mx-5 mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-200/95 sm:mx-6">
                {errorMessage}
              </div>
            )}

            <div className="px-5 py-5 sm:px-6 sm:py-6">

            {/* Broadcast */}
            {controlTab === 'broadcast' && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Trimite mesaj tuturor
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Se aplică politicile de livrare pe canalele selectate (email, in-app).
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Titlu</label>
                      <input
                        type="text"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Mesaj</label>
                      <textarea
                        value={broadcastForm.message}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                        rows={4}
                        className="enterprise-input w-full resize-y rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                      {(['email', 'inApp', 'sms'] as const).map((channel) => (
                        <label key={channel} className="flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-primary)]">
                          <input
                            type="checkbox"
                            checked={broadcastForm.channels[channel]}
                            onChange={() =>
                              setBroadcastForm({
                                ...broadcastForm,
                                channels: { ...broadcastForm.channels, [channel]: !broadcastForm.channels[channel] }
                              })
                            }
                            className="h-4 w-4 cursor-pointer accent-cyan-500"
                          />
                          {channel === 'inApp' ? 'In-App' : channel.toUpperCase()}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={broadcastForm.schedule}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, schedule: e.target.value as 'now' | 'later' })}
                        className="enterprise-input rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="now">Trimite acum</option>
                        <option value="later">Programează</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={broadcastForm.scheduledAt}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduledAt: e.target.value })}
                        className="enterprise-input min-w-[200px] flex-1 rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        disabled={broadcastForm.schedule !== 'later'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleBroadcast}
                      className="w-full rounded-lg bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow)] transition-[filter,box-shadow] duration-200 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Continuă către confirmare
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Istoric recent
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Ultimele înregistrări sincronizate de pe server.
                  </p>
                  <div className="mt-3 max-h-[min(52vh,28rem)] space-y-1.5 overflow-y-auto pr-0.5 text-[var(--text-tertiary)]">
                    {broadcasts.length === 0 ? (
                      <div className="rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)] px-3 py-6 text-center text-[12px] text-[var(--text-muted)]">
                        Nu există broadcast-uri recente.
                      </div>
                    ) : (
                      broadcasts.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)] px-3 py-2 transition-[border-color] duration-200 hover:border-white/[0.1]"
                        >
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                            Segment: {item.segment} · {item.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            {controlTab === 'benefits' && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Beneficii globale
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Aplică reduceri și bonusuri conform segmentului selectat.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Discount global (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={benefitsForm.globalDiscount}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, globalDiscount: parseInt(e.target.value) || 0 })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="grid gap-3 border-t border-white/[0.05] pt-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Promovări gratuite</label>
                        <input
                          type="number"
                          min={0}
                          value={benefitsForm.freePromotions}
                          onChange={(e) => setBenefitsForm({ ...benefitsForm, freePromotions: parseInt(e.target.value) || 0 })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Tip promovare</label>
                        <select
                          value={benefitsForm.promotionType}
                          onChange={(e) => setBenefitsForm({ ...benefitsForm, promotionType: e.target.value as PromotionType })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        >
                          <option value="top">TOP</option>
                          <option value="urgent">URGENT</option>
                          <option value="featured">Evidențiat</option>
                          <option value="refresh">Reîmprospătare</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Bonus credite (RON)</label>
                      <input
                        type="number"
                        min={0}
                        value={benefitsForm.creditsBonus}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, creditsBonus: parseInt(e.target.value) || 0 })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Aplică pentru</label>
                      <select
                        value={benefitsForm.applyTo}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, applyTo: e.target.value as ApplyTo })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="all">Toți utilizatorii</option>
                        <option value="new">Utilizatori noi</option>
                        <option value="active">Utilizatori activi</option>
                        <option value="inactive">Utilizatori inactivi</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Expirare (zile)</label>
                      <input
                        type="number"
                        min={1}
                        value={benefitsForm.expiryDays}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, expiryDays: parseInt(e.target.value) || 30 })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyBenefits}
                      className="w-full rounded-lg bg-gradient-to-r from-amber-600/95 to-orange-700/95 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-md)] transition-[filter] duration-200 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Aplică beneficii
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Previzualizare
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Valorile de mai sus înainte de trimitere.
                  </p>
                  <div className="mt-3 divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)]/40">
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      <span>Discount</span>
                      <span className="font-medium tabular-nums text-[var(--text-primary)]">−{benefitsForm.globalDiscount}%</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      <span>Promovări</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {benefitsForm.freePromotions} × {benefitsForm.promotionType}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      <span>Bonus credite</span>
                      <span className="font-medium tabular-nums text-[var(--text-primary)]">{benefitsForm.creditsBonus} RON</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      <span>Segment</span>
                      <span className="font-medium text-[var(--text-primary)]">{benefitsForm.applyTo}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      <span>Expirare</span>
                      <span className="font-medium tabular-nums text-[var(--text-primary)]">{benefitsForm.expiryDays} zile</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Toggles */}
            {controlTab === 'system' && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Comutatoare platformă
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Feature flags persistate în baza de date.
                  </p>
                  <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)]/30">
                    {([
                      { key: 'registrations', label: 'Înregistrări noi' },
                      { key: 'newListings', label: 'Anunțuri noi' },
                      { key: 'payments', label: 'Plăți' },
                      { key: 'promotions', label: 'Promovări' },
                      { key: 'maintenanceMode', label: 'Mod mentenanță' },
                    ] as const).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 bg-[var(--bg-elevated)]/20 px-3 py-2.5 transition-colors duration-200 hover:bg-[var(--bg-elevated)]/35"
                      >
                        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleSystem(item.key)}
                          className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-[background,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                            systemToggles[item.key]
                              ? 'bg-emerald-500/18 text-emerald-200'
                              : 'bg-red-500/15 text-red-200'
                          }`}
                        >
                          {systemToggles[item.key] ? 'Activ' : 'Oprit'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Securitate
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Strat de protecție pe API; detalii operaționale în jurnalele serverului.
                  </p>
                  <div className="mt-3 divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)]/40 text-[12px] text-[var(--text-tertiary)]">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>Rate limiting</span>
                      <span className="font-medium text-[var(--text-secondary)]">configurat în cod</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>Validare & CSRF</span>
                      <span className="font-medium text-[var(--text-secondary)]">configurat în cod</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="mb-2 font-medium text-[var(--text-secondary)]">Jurnal audit (ultimele înregistrări)</p>
                      {auditLogsError ? (
                        <p className="text-[11px] text-amber-200/90">{auditLogsError}</p>
                      ) : recentAuditLogs.length === 0 ? (
                        <p className="text-[11px]">Nicio înregistrare încărcată.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {recentAuditLogs.map((log) => (
                            <li key={log.id} className="font-mono text-[11px] text-[var(--text-tertiary)]">
                              <span className="text-[var(--text-secondary)]">{log.action}</span>
                              {log.resource ? ` · ${log.resource}` : ""}
                              {" · "}
                              {log.createdAt
                                ? new Date(log.createdAt).toLocaleString("ro-RO")
                                : "—"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {controlTab === 'bulk' && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Acțiuni în masă
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Verifică segmentul înainte de execuție; răspunsul API indică câți utilizatori au fost actualizați.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Segment utilizatori</label>
                      <select
                        value={bulkForm.segment}
                        onChange={(e) => setBulkForm({ ...bulkForm, segment: e.target.value as BulkSegment })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="active">Activi</option>
                        <option value="inactive">Inactivi</option>
                        <option value="new">Noi</option>
                        <option value="banned">Banați</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Acțiune</label>
                      <select
                        value={bulkForm.action}
                        onChange={(e) => setBulkForm({ ...bulkForm, action: e.target.value as BulkAction })}
                        className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="deactivate">Dezactivează conturi</option>
                        <option value="activate">Activează conturi</option>
                        <option value="grant_discount">Acordă discount (%)</option>
                        <option value="grant_free_promos">Acordă promovări gratuite</option>
                      </select>
                    </div>

                    {bulkForm.action === 'grant_discount' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Procent discount</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={bulkForm.percent}
                          onChange={(e) => setBulkForm({ ...bulkForm, percent: parseInt(e.target.value) || 0 })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        />
                      </div>
                    )}

                    {bulkForm.action === 'grant_free_promos' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Promovări gratuite</label>
                        <input
                          type="number"
                          min={0}
                          value={bulkForm.freePromos}
                          onChange={(e) => setBulkForm({ ...bulkForm, freePromos: parseInt(e.target.value) || 0 })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        />
                      </div>
                    )}

                    {bulkForm.action === 'grant_free_promos' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Tip promovare</label>
                        <select
                          value={bulkForm.promotionType}
                          onChange={(e) => setBulkForm({ ...bulkForm, promotionType: e.target.value as PromotionType })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        >
                          <option value="top">TOP</option>
                          <option value="urgent">URGENT</option>
                          <option value="featured">Evidențiat</option>
                          <option value="refresh">Reîmprospătare</option>
                        </select>
                      </div>
                    )}

                    {bulkForm.action === 'grant_free_promos' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Expirare (zile)</label>
                        <input
                          type="number"
                          min={1}
                          value={bulkForm.expiryDays}
                          onChange={(e) => setBulkForm({ ...bulkForm, expiryDays: parseInt(e.target.value) || 30 })}
                          className="enterprise-input w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleBulkAction}
                      className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-700/95 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-md)] transition-[filter] duration-200 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Execută acțiunea
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/55 p-4 ring-1 ring-inset ring-white/[0.02] sm:p-5">
                  <h3 className="border-b border-white/[0.06] pb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                    Parametri selectați
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    Utilizatori înregistrați pe platformă (KPI de sus):{' '}
                    <span className="font-mono font-medium text-[var(--text-primary)]">{stats.registeredUsers}</span>
                  </p>
                  <div className="mt-3 divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)]/40 text-[12px] text-[var(--text-tertiary)]">
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2">
                      <span>Segment</span>
                      <span className="font-medium text-[var(--text-primary)]">{bulkForm.segment}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2">
                      <span>Acțiune</span>
                      <span className="font-medium text-[var(--text-primary)]">{bulkForm.action}</span>
                    </div>
                    {bulkForm.action === 'grant_discount' && (
                      <div className="flex items-baseline justify-between gap-2 px-3 py-2">
                        <span>Discount</span>
                        <span className="font-medium tabular-nums text-[var(--text-primary)]">−{bulkForm.percent}%</span>
                      </div>
                    )}
                    {bulkForm.action === 'grant_free_promos' && (
                      <div className="flex items-baseline justify-between gap-2 px-3 py-2">
                        <span>Promovări</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {bulkForm.freePromos} × {bulkForm.promotionType}
                        </span>
                      </div>
                    )}
                    <p className="bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-snug text-amber-200/90">
                      Numărul exact de înregistrări modificate este returnat de server după execuție (câmpul{' '}
                      <span className="font-mono">updated</span>).
                    </p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
        )}

        {/* SECURITY: Unauthorized state */}
        {!isAuthorized && !isLoading && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center min-h-96 flex items-center justify-center">
              <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-8">
                <p className="text-red-400 text-xl font-bold">🔒 Acces respins</p>
                <p className="text-gray-400 mt-2">Nu ai permisiunea să accesezi admin dashboard.</p>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Confirmation Modal */}
        {showBroadcastConfirm && broadcastConfirmData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="broadcast-confirm-title"
              className="max-h-[min(90vh,720px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/[0.1] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-xl)] ring-1 ring-inset ring-white/[0.03] sm:p-6"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-lg" aria-hidden>
                  ⚠️
                </div>
                <div>
                  <h2 id="broadcast-confirm-title" className="text-lg font-semibold text-[var(--text-primary)]">
                    Confirmare broadcast
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                    Revizuiește conținutul înainte de trimitere către utilizatori.
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-3 rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/40 p-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Titlu</label>
                  <input
                    type="text"
                    value={broadcastConfirmData.title}
                    onChange={(e) => setBroadcastConfirmData({ ...broadcastConfirmData, title: e.target.value })}
                    className="enterprise-input w-full rounded-lg px-3 py-2 text-[15px] font-medium text-[var(--text-primary)]"
                    placeholder="Titlu mesaj..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">Mesaj</label>
                  <textarea
                    value={broadcastConfirmData.message}
                    onChange={(e) => setBroadcastConfirmData({ ...broadcastConfirmData, message: e.target.value })}
                    rows={4}
                    className="enterprise-input w-full resize-y rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)]"
                    placeholder="Conținut mesaj..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Canale</p>
                    <div className="flex flex-wrap gap-2">
                      {broadcastConfirmData.channels.email && (
                        <span className="rounded-lg bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-300/95">
                          Email
                        </span>
                      )}
                      {broadcastConfirmData.channels.inApp && (
                        <span className="rounded-lg bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300/95">
                          In-app
                        </span>
                      )}
                      {broadcastConfirmData.channels.sms && (
                        <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300/95">
                          SMS
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Program</p>
                    <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/60 px-3 py-2 text-sm">
                      {broadcastConfirmData.schedule === 'now' ? (
                        <p className="font-medium text-emerald-300/95">Trimitere imediată</p>
                      ) : (
                        <p className="font-medium text-amber-200/95">{broadcastConfirmData.scheduledAt}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                <p className="text-[13px] leading-snug text-amber-100/95">
                  <strong className="font-semibold">Atenție:</strong> mesajul se adresează tuturor utilizatorilor eligibili.
                  Operațiunea nu se poate anula retroactiv din această interfață.
                </p>
              </div>

              {broadcastSuccess && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/25 text-lg text-emerald-200">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-200/95">Mesaj acceptat pentru livrare</p>
                      <p className="mt-0.5 text-sm text-emerald-200/75">
                        Poți închide fereastra; lista de broadcast se actualizează automat.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && !broadcastSuccess && (
                <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3">
                  <p className="text-[13px] text-red-200/95">{errorMessage}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                {!broadcastSuccess ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBroadcastConfirm(false);
                        setBroadcastConfirmData(null);
                        setErrorMessage('');
                      }}
                      disabled={broadcastSending}
                      className="flex-1 rounded-lg border border-white/[0.12] bg-[var(--bg-secondary)] px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-[background,opacity] duration-200 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anulează
                    </button>
                    <button
                      type="button"
                      onClick={sendBroadcastConfirmed}
                      disabled={broadcastSending || !broadcastConfirmData.title || !broadcastConfirmData.message}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-md)] transition-[filter,opacity] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {broadcastSending ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Se trimite…
                        </>
                      ) : (
                        'Confirmă și trimite'
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBroadcastConfirm(false);
                      setBroadcastConfirmData(null);
                      setBroadcastSuccess(false);
                      setErrorMessage('');
                    }}
                    className="w-full rounded-lg bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow)] transition-[filter] duration-200 hover:brightness-110"
                  >
                    Închide
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
