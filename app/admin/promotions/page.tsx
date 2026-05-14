'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { ToastProvider, useToast } from '@/app/components/ui';
import { fetchWithAuthRefresh, putJsonWithAuthRefresh } from '@/lib/admin-fetch';

type PromoPackage = {
  id: string;
  name: string;
  price: number;
  duration: number;
  enabled: boolean;
  discount: number;
};

type FieldDrafts = Record<string, { price?: string; discount?: string }>;

const PACKAGE_ORDER = ['top', 'urgent', 'featured', 'refresh'] as const;

function mergePackagesForSave(packages: PromoPackage[], drafts: FieldDrafts): PromoPackage[] {
  return packages.map((pkg) => {
    let { price, discount } = pkg;
    const pRaw = drafts[pkg.id]?.price;
    if (pRaw !== undefined && pRaw !== '') {
      const n = parseInt(pRaw, 10);
      price = Number.isNaN(n) ? price : Math.max(0, Math.min(999_999, n));
    }
    const dRaw = drafts[pkg.id]?.discount;
    if (dRaw !== undefined && dRaw !== '') {
      const n = parseInt(dRaw, 10);
      discount = Number.isNaN(n) ? discount : Math.max(0, Math.min(100, n));
    }
    return { ...pkg, price, discount };
  });
}

function toPayload(merged: PromoPackage[]) {
  return PACKAGE_ORDER.map((oid) => {
    const p = merged.find((x) => x.id === oid);
    if (!p) throw new Error('missing package');
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      duration: p.duration,
      enabled: p.enabled,
      discount: p.discount,
    };
  });
}

function AdminPromotionsPageContent() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useAdminAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('packages');

  const [packages, setPackages] = useState<PromoPackage[]>([
    { id: 'top', name: 'TOP Anunț', price: 49, duration: 7, enabled: true, discount: 0 },
    { id: 'urgent', name: 'Anunț URGENT', price: 29, duration: 3, enabled: true, discount: 0 },
    { id: 'featured', name: 'Anunț Evidențiat', price: 19, duration: 5, enabled: true, discount: 0 },
    { id: 'refresh', name: 'Reîmprospătare', price: 9, duration: 0, enabled: true, discount: 0 },
  ]);

  /** Text liber în timpul editării; fără `parseInt(...) || 0` la fiecare tastă (ștergerea nu mai forțează 0). */
  const [fieldDrafts, setFieldDrafts] = useState<FieldDrafts>({});
  const fieldDraftsRef = useRef<FieldDrafts>({});
  fieldDraftsRef.current = fieldDrafts;

  const [savingPackages, setSavingPackages] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [promotions, setPromotions] = useState<
    Array<{
      id: number;
      code: string;
      type: 'percent' | 'fixed' | 'free';
      value: number;
      enabled: boolean;
      usageCount: number;
      packageId?: string;
    }>
  >([]);

  const [promoMetrics, setPromoMetrics] = useState<{
    activePromotedListings: number;
    promotionPaymentsSucceededLast30d: number;
    promotionRevenueLast30dMinorUnits: number;
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/');
    }
  }, [router, isAuthorized, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthorized) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuthRefresh('/api/admin/analytics/summary');
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          promotions?: {
            activePromotedListings?: number;
            promotionPaymentsSucceededLast30d?: number;
            promotionRevenueLast30dMinorUnits?: number;
          };
        };
        if (!data.promotions) return;
        setPromoMetrics({
          activePromotedListings: data.promotions.activePromotedListings ?? 0,
          promotionPaymentsSucceededLast30d: data.promotions.promotionPaymentsSucceededLast30d ?? 0,
          promotionRevenueLast30dMinorUnits: data.promotions.promotionRevenueLast30dMinorUnits ?? 0,
        });
      } catch {
        setPromoMetrics(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthorized) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuthRefresh('/api/admin/promotion-packages');
        if (cancelled) return;
        if (!res.ok) {
          showToast({
            variant: 'error',
            title: 'Nu s-au încărcat pachetele',
            description: `HTTP ${res.status}. Reautentifică-te sau reîncearcă.`,
            duration: 9000,
          });
          return;
        }
        const data = (await res.json()) as { packages?: PromoPackage[] };
        if (cancelled || !data.packages?.length) return;
        setPackages(data.packages);
        setLastSavedAt(new Date());
        setSaveError(null);
      } catch {
        if (!cancelled) {
          showToast({
            variant: 'error',
            title: 'Eroare la încărcarea pachetelor',
            description: 'Reîmprospătează pagina.',
            duration: 8000,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, isLoading, showToast]);

  const persistMerged = useCallback(
    async (merged: PromoPackage[], options: { silent?: boolean } = {}) => {
      const silent = options.silent ?? false;
      setSavingPackages(true);
      setSaveError(null);
      try {
        const payload = toPayload(merged);
        const res = await putJsonWithAuthRefresh('/api/admin/promotion-packages', { packages: payload });
        const errBody = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof errBody?.error === 'string' ? errBody.error : 'Eroare la salvare';
          setSaveError(msg);
          showToast({
            variant: 'error',
            title: 'Salvare eșuată',
            description: msg,
            duration: 9000,
          });
          return;
        }
        setPackages(merged);
        if (!silent) {
          setFieldDrafts({});
        }
        setLastSavedAt(new Date());
        if (!silent) {
          showToast({
            variant: 'success',
            title: 'Modificări salvate',
            description:
              'Pachetele sunt în baza de date. Promovarea și plata cu cardul folosesc aceste prețuri.',
            duration: 6500,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Eroare rețea';
        setSaveError(msg);
        showToast({
          variant: 'error',
          title: 'Salvare eșuată',
          description: msg,
          duration: 8000,
        });
      } finally {
        setSavingPackages(false);
      }
    },
    [showToast]
  );

  const commitPriceDraft = useCallback(
    (pkg: PromoPackage) => {
      const raw = fieldDrafts[pkg.id]?.price;
      if (raw === undefined) return;
      let next: number;
      if (raw === '') {
        next = pkg.price;
      } else {
        const n = parseInt(raw, 10);
        next = Number.isNaN(n) ? pkg.price : Math.max(0, Math.min(999_999, n));
      }
      const nextPackages = packages.map((p) => (p.id === pkg.id ? { ...p, price: next } : p));
      let newDrafts: FieldDrafts = { ...fieldDrafts };
      const pkgDraft = { ...newDrafts[pkg.id] } as { price?: string; discount?: string };
      delete pkgDraft.price;
      if (Object.keys(pkgDraft).length === 0) {
        const { [pkg.id]: _, ...rest } = newDrafts;
        newDrafts = rest;
      } else {
        newDrafts = { ...newDrafts, [pkg.id]: pkgDraft };
      }
      setPackages(nextPackages);
      setFieldDrafts(newDrafts);
      void persistMerged(mergePackagesForSave(nextPackages, newDrafts), { silent: true });
    },
    [fieldDrafts, packages, persistMerged]
  );

  const commitDiscountDraft = useCallback(
    (pkg: PromoPackage) => {
      const raw = fieldDrafts[pkg.id]?.discount;
      if (raw === undefined) return;
      let next: number;
      if (raw === '') {
        next = pkg.discount;
      } else {
        const n = parseInt(raw, 10);
        next = Number.isNaN(n) ? pkg.discount : Math.max(0, Math.min(100, n));
      }
      const nextPackages = packages.map((p) => (p.id === pkg.id ? { ...p, discount: next } : p));
      let newDrafts: FieldDrafts = { ...fieldDrafts };
      const pkgDraft = { ...newDrafts[pkg.id] } as { price?: string; discount?: string };
      delete pkgDraft.discount;
      if (Object.keys(pkgDraft).length === 0) {
        const { [pkg.id]: _, ...rest } = newDrafts;
        newDrafts = rest;
      } else {
        newDrafts = { ...newDrafts, [pkg.id]: pkgDraft };
      }
      setPackages(nextPackages);
      setFieldDrafts(newDrafts);
      void persistMerged(mergePackagesForSave(nextPackages, newDrafts), { silent: true });
    },
    [fieldDrafts, packages, persistMerged]
  );

  const setPriceDraft = useCallback((pkgId: string, raw: string) => {
    if (raw !== '' && !/^\d+$/.test(raw)) return;
    setFieldDrafts((d) => ({ ...d, [pkgId]: { ...d[pkgId], price: raw } }));
  }, []);

  const setDiscountDraft = useCallback((pkgId: string, raw: string) => {
    if (raw !== '' && !/^\d{1,3}$/.test(raw)) return;
    if (raw !== '' && parseInt(raw, 10) > 100) return;
    setFieldDrafts((d) => ({ ...d, [pkgId]: { ...d[pkgId], discount: raw } }));
  }, []);

  const togglePackage = useCallback(
    (id: string) => {
      setPackages((prev) => {
        const next = prev.map((pkg) => (pkg.id === id ? { ...pkg, enabled: !pkg.enabled } : pkg));
        const merged = mergePackagesForSave(next, fieldDraftsRef.current);
        void persistMerged(merged, { silent: true });
        return next;
      });
    },
    [persistMerged]
  );

  const addPromotion = () => {
    const code = prompt('Cod promoțional:');
    if (!code) return;

    const type = prompt('Tip (percent/fixed/free):');
    if (!type) return;

    const value = parseInt(prompt('Valoare:') || '0', 10);

    setPromotions((prev) => [
      ...prev,
      {
        id: Date.now(),
        code: code.toUpperCase(),
        type: type as 'percent' | 'fixed' | 'free',
        value,
        enabled: true,
        usageCount: 0,
      },
    ]);
  };

  const togglePromotion = (id: number) => {
    setPromotions((prev) => prev.map((promo) => (promo.id === id ? { ...promo, enabled: !promo.enabled } : promo)));
  };

  const deletePromotion = (id: number) => {
    if (confirm('Ștergi această promoție?')) {
      setPromotions((prev) => prev.filter((promo) => promo.id !== id));
    }
  };

  const savePackages = useCallback(async () => {
    const merged = mergePackagesForSave(packages, fieldDrafts);
    await persistMerged(merged, { silent: false });
  }, [packages, fieldDrafts, persistMerged]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-tertiary)]">Verificare acces admin…</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">Acces respins</p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Nu ai permisiunea pentru această pagină.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] pb-32 pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(36rem,58vh)] max-h-[500px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-4%,rgba(255,90,0,0.10),transparent_56%),radial-gradient(ellipse_42%_34%_at_12%_12%,rgba(124,92,246,0.12),transparent_50%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <header className="mb-10 flex flex-col gap-4 border-b border-[var(--border-primary)] pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Marketing
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Promoții & pachete
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--text-tertiary)]">
                Prețurile pachetelor se salvează pe server și se reflectă la promovare și la plată cu cardul.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
            >
              ← Dashboard
            </Link>
          </header>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {promoMetrics ? (
              [
                {
                  label: 'Venit promovări (30z)',
                  val: `${(promoMetrics.promotionRevenueLast30dMinorUnits / 100).toLocaleString('ro-RO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} RON`,
                  hint: 'Plăți reușite promote_listing/promotion',
                },
                {
                  label: 'Plăți promovare (30z)',
                  val: String(promoMetrics.promotionPaymentsSucceededLast30d),
                  hint: 'Înregistrări Payment succeeded',
                },
                {
                  label: 'Anunțuri promovate acum',
                  val: String(promoMetrics.activePromotedListings),
                  hint: 'isPromoted + expirare viitoare sau fără dată',
                },
                {
                  label: 'Coduri promo (UI)',
                  val: String(promotions.length),
                  hint: 'Lista locală — fără persistență DB încă',
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_48px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.04] backdrop-blur-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {k.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {k.val}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{k.hint}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/80 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] backdrop-blur-sm">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Indicatori indisponibili</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Nu s-au putut încărca agregările din server; restul paginii rămâne funcțional.
                </p>
              </div>
            )}
          </div>

          <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Secțiuni promoții">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'packages'}
              onClick={() => setActiveTab('packages')}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 ${
                activeTab === 'packages'
                  ? 'border-orange-500/30 bg-orange-500/[0.08] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:border-white/10 hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Pachete
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'codes'}
              onClick={() => setActiveTab('codes')}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 ${
                activeTab === 'codes'
                  ? 'border-orange-500/30 bg-orange-500/[0.08] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:border-white/10 hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Coduri promoționale
            </button>
          </div>

          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Pachete de promovare</h2>
                <button
                  type="button"
                  onClick={() => void savePackages()}
                  disabled={savingPackages}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPackages ? 'Se salvează…' : 'Salvează tot acum'}
                </button>
              </div>
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/95">
                <span className="font-semibold text-emerald-50">Salvare automată:</span> când termini editarea unui câmp
                (click în afara lui) sau când activezi/dezactivezi un pachet, prețul se trimite imediat pe server. Poți folosi
                și butonul de salvare sau bara de jos.
              </p>
              {saveError && (
                <p className="rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-3 text-sm text-red-100">{saveError}</p>
              )}

              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{pkg.name}</h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            pkg.enabled ? 'bg-emerald-500/15 text-emerald-300/95' : 'bg-red-500/15 text-red-300/95'
                          }`}
                        >
                          {pkg.enabled ? 'Activ' : 'Dezactivat'}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Preț (RON)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Preț ${pkg.name}`}
                            value={fieldDrafts[pkg.id]?.price ?? String(pkg.price)}
                            onChange={(e) => setPriceDraft(pkg.id, e.target.value)}
                            onBlur={() => commitPriceDraft(pkg)}
                            className="enterprise-input w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Discount (%)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Discount ${pkg.name}`}
                            value={fieldDrafts[pkg.id]?.discount ?? String(pkg.discount)}
                            onChange={(e) => setDiscountDraft(pkg.id, e.target.value)}
                            onBlur={() => commitDiscountDraft(pkg)}
                            className="enterprise-input w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Durată (zile)</label>
                          <input
                            type="number"
                            value={pkg.duration}
                            disabled
                            className="enterprise-input w-full cursor-not-allowed rounded-xl px-4 py-2.5 text-sm opacity-60"
                          />
                        </div>
                      </div>

                      {pkg.discount > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-[var(--text-muted)] line-through">{pkg.price} RON</span>
                          <span className="font-mono font-semibold text-emerald-300/95">
                            {Math.round(pkg.price * (1 - pkg.discount / 100))} RON
                          </span>
                          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300/95">
                            −{pkg.discount}%
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePackage(pkg.id)}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                        pkg.enabled
                          ? 'border border-red-500/25 bg-red-500/10 text-red-200/95 hover:bg-red-500/15'
                          : 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200/95 hover:bg-emerald-500/15'
                      }`}
                    >
                      {pkg.enabled ? 'Dezactivează' : 'Activează'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="fixed bottom-0 left-0 right-0 z-[650] border-t border-white/[0.14] bg-[#0f0f14]/98 px-4 py-3 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md supports-[backdrop-filter]:bg-[#0f0f14]/92">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                <p className="text-xs text-[var(--text-secondary)] sm:text-sm">
                  {savingPackages && <span className="font-medium text-[var(--accent-secondary)]">Se salvează pe server…</span>}
                  {!savingPackages && saveError && <span className="font-medium text-red-300">{saveError}</span>}
                  {!savingPackages && !saveError && lastSavedAt && (
                    <span>
                      Sincronizat cu baza de date:{' '}
                      <time className="font-mono tabular-nums text-[var(--text-primary)]">
                        {lastSavedAt.toLocaleString('ro-RO')}
                      </time>
                    </span>
                  )}
                  {!savingPackages && !saveError && !lastSavedAt && (
                    <span>Încărcare sau așteptare prima salvare…</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void savePackages()}
                  disabled={savingPackages}
                  className="w-full shrink-0 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px] sm:px-8"
                >
                  {savingPackages ? 'Se salvează…' : 'Salvează modificările'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'codes' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Coduri promoționale</h2>
                <button
                  type="button"
                  onClick={addPromotion}
                  className="rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                >
                  Adaugă cod
                </button>
              </div>

              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-secondary)]">
                          {promo.code}
                        </code>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            promo.enabled ? 'bg-emerald-500/15 text-emerald-300/95' : 'bg-red-500/15 text-red-300/95'
                          }`}
                        >
                          {promo.enabled ? 'Activ' : 'Oprit'}
                        </span>
                        {promo.type === 'percent' && (
                          <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300/95">
                            −{promo.value}%
                          </span>
                        )}
                        {promo.type === 'fixed' && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300/95">
                            −{promo.value} RON
                          </span>
                        )}
                        {promo.type === 'free' && (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200/95">
                            Gratuit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Utilizări: <span className="font-mono text-[var(--text-secondary)]">{promo.usageCount}</span>
                        {promo.packageId && (
                          <>
                            {' '}
                            · Pachet:{' '}
                            <span className="font-medium text-[var(--text-secondary)]">{promo.packageId.toUpperCase()}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePromotion(promo.id)}
                        className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)]"
                      >
                        {promo.enabled ? 'Pauză' : 'Activează'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePromotion(promo.id)}
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200/95 transition hover:bg-red-500/15"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function AdminPromotionsPage() {
  return (
    <ToastProvider toastContainerClassName="top-[4.5rem] z-[8100] sm:top-24">
      <AdminPromotionsPageContent />
    </ToastProvider>
  );
}
