'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchWithAuthRefresh,
  postJsonWithAuthRefresh,
} from '@/lib/admin-fetch';

type Severity = 'info' | 'success' | 'warning' | 'critical';

export type AdminNotificationRow = {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  resolvedAt: string | null;
  metadata: unknown;
  createdAt: string;
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'unread', label: 'Necitite' },
  { id: 'critical', label: 'Critice' },
  { id: 'payments', label: 'Plăți' },
  { id: 'users', label: 'Useri' },
  { id: 'listings', label: 'Anunțuri' },
  { id: 'reports', label: 'Rapoarte' },
];

function severityStyles(s: Severity): string {
  switch (s) {
    case 'success':
      return 'border-emerald-500/35 bg-emerald-950/40 text-emerald-100';
    case 'warning':
      return 'border-amber-500/40 bg-amber-950/35 text-amber-50';
    case 'critical':
      return 'border-red-500/45 bg-red-950/50 text-red-50';
    default:
      return 'border-sky-500/30 bg-slate-900/60 text-slate-100';
  }
}

function actionFor(n: AdminNotificationRow): { label: string; href: string } | null {
  const et = (n.entityType || '').toLowerCase();
  const id = n.entityId;
  if (!id) return null;
  if (et === 'user') return { label: 'Vezi utilizator', href: '/admin/moderation' };
  if (et === 'listing') return { label: 'Vezi anunț', href: `/listings/${id}` };
  if (et === 'payment') return { label: 'Verifică plata', href: '/admin/invoices' };
  if (et === 'report') return { label: 'Deschide raportarea', href: '/admin/moderation' };
  if (et === 'conversation') return { label: 'Deschide mesaje', href: '/admin/messaging' };
  return null;
}

export default function AdminAlertCenter() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<AdminNotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filter === 'all' ? '' : `?filter=${encodeURIComponent(filter)}`;
      const res = await fetchWithAuthRefresh(`/api/admin/notifications${q}`);
      let data: {
        error?: string;
        success?: boolean;
        notifications?: AdminNotificationRow[];
        total?: number;
        degraded?: boolean;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error('Răspuns invalid de la server');
      }
      if (!res.ok) {
        throw new Error(data.error || `Eroare încărcare (${res.status})`);
      }
      const rows = Array.isArray(data.notifications) ? data.notifications : [];
      setItems(rows);
      setTotal(typeof data.total === 'number' ? data.total : rows.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const criticalOpen = useMemo(
    () => items.filter((i) => i.severity === 'critical' && !i.readAt).length,
    [items]
  );

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const res = await postJsonWithAuthRefresh(
        `/api/admin/notifications/${id}/read`,
        {}
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Eroare');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await postJsonWithAuthRefresh(
        `/api/admin/notifications/${id}/resolve`,
        {}
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Eroare');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setBusyId('__all__');
    try {
      const res = await postJsonWithAuthRefresh(
        '/api/admin/notifications/mark-all-read',
        {}
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Eroare');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className={`mb-8 rounded-2xl border p-4 sm:p-5 ${
        criticalOpen > 0
          ? 'border-red-500/45 bg-red-950/25 shadow-[0_0_0_1px_rgba(239,68,68,0.12)]'
          : 'border-white/[0.08] bg-[var(--bg-elevated)]/80'
      }`}
      aria-labelledby="admin-alert-center-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="admin-alert-center-heading"
            className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
          >
            Alertă admin
          </h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Evenimente reale din platformă (înregistrate în baza de date). Sortate după data creării.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-focus)]"
          >
            Reîncarcă
          </button>
          <button
            type="button"
            disabled={busyId === '__all__'}
            onClick={() => void markAllRead()}
            className="rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-focus)] disabled:opacity-50"
          >
            Marchează toate citite
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              filter === f.id
                ? 'border-orange-500/50 bg-orange-500/15 text-orange-100'
                : 'border-white/[0.08] bg-black/20 text-[var(--text-tertiary)] hover:border-white/15'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10 text-sm text-[var(--text-tertiary)]">
            Se încarcă…
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] py-10 text-center text-sm text-[var(--text-tertiary)]">
            Nu există alerte active.
          </p>
        ) : (
          items.map((n) => {
            const act = actionFor(n);
            const showAct =
              (n.severity === 'critical' || n.severity === 'warning') && act;
            return (
              <article
                key={n.id}
                className={`rounded-xl border p-4 ${severityStyles(n.severity)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
                      {n.severity} · {n.type}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{n.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed opacity-95">{n.message}</p>
                    <p className="mt-2 text-[10px] opacity-70">
                      {new Date(n.createdAt).toLocaleString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!n.readAt && (
                      <button
                        type="button"
                        disabled={busyId === n.id}
                        onClick={() => void markRead(n.id)}
                        className="rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold hover:bg-black/50 disabled:opacity-50"
                      >
                        Citit
                      </button>
                    )}
                    {!n.resolvedAt && (
                      <button
                        type="button"
                        disabled={busyId === n.id}
                        onClick={() => void resolve(n.id)}
                        className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/15 disabled:opacity-50"
                      >
                        Rezolvat
                      </button>
                    )}
                  </div>
                </div>
                {showAct && act && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={act.href}
                      className="inline-flex items-center rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/25"
                    >
                      {act.label}
                    </Link>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {!loading && total > items.length && (
        <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
          Afișate {items.length} din {total}. Folosește filtre pentru a restrânge.
        </p>
      )}
    </section>
  );
}
