'use client';

import { useMemo, useState } from 'react';

export type EnterpriseModerationUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: 'active' | 'banned' | 'suspended';
  listings: number;
  credits: number;
  freePromotions: number;
  discount: number;
  trustScore: number;
  accountType: string;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  lastLoginIp: string | null;
  reportsCount: number;
  moderationSuspendedUntil: string | null;
  moderationSuspensionReason: string | null;
};

type SortKey = 'created' | 'email' | 'trust' | 'listings' | 'role';

type Props = {
  users: EnterpriseModerationUser[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  expandedUserId: string | null;
  onToggleRow: (userId: string) => void;
  onOpenCredits: (user: EnterpriseModerationUser) => void;
  /** Deschide panoul de detaliu și sare la lista de anunțuri (ex. din coloana „Anunțuri”). */
  onViewUserListings: (user: EnterpriseModerationUser) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  onMakeAdmin: (userId: string) => void;
  onSuspend: (userId: string, durationHours: number, reason: string) => Promise<void>;
  onUnsuspend: (userId: string) => Promise<void>;
};

const ROLE_LABEL: Record<string, string> = {
  user: 'Utilizator',
  admin: 'Admin',
  owner: 'Owner',
  moderator: 'Moderator',
  dealer: 'Dealer',
  support: 'Suport',
  finance: 'Finanțe',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ro-RO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function StatusBadge({ user }: { user: EnterpriseModerationUser }) {
  if (user.status === 'banned') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md border border-red-500/40 bg-red-500/18 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        Blocat
      </span>
    );
  }
  if (user.status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/38 bg-amber-500/16 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        Suspendat
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-500/32 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      Activ
    </span>
  );
}

export default function UserModerationEnterprise({
  users,
  loading,
  error,
  onRetry,
  searchQuery,
  onSearchChange,
  expandedUserId,
  onToggleRow,
  onOpenCredits,
  onViewUserListings,
  onBan,
  onUnban,
  onMakeAdmin,
  onSuspend,
  onUnsuspend,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [suspendTarget, setSuspendTarget] = useState<EnterpriseModerationUser | null>(null);
  const [suspendHours, setSuspendHours] = useState(24);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendBusy, setSuspendBusy] = useState(false);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? [...users]
      : users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.phone && u.phone.includes(q))
        );

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'email':
          cmp = a.email.localeCompare(b.email);
          break;
        case 'trust':
          cmp = a.trustScore - b.trustScore;
          break;
        case 'listings':
          cmp = a.listings - b.listings;
          break;
        case 'role':
          cmp = a.role.localeCompare(b.role);
          break;
        case 'created':
        default:
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, searchQuery, sortKey, sortDir]);

  const stats = useMemo(() => {
    const banned = users.filter((u) => u.status === 'banned').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    const active = users.filter((u) => u.status === 'active').length;
    return { total: users.length, active, suspended, banned };
  }, [users]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'email' || key === 'role' ? 'asc' : 'desc');
    }
  };

  const renderUserActions = (user: EnterpriseModerationUser) => {
    const targetIsAdminOrOwner = user.role === 'admin' || user.role === 'owner';
    return (
      <div className="flex flex-wrap gap-1.5 md:justify-end md:gap-1">
        <button
          type="button"
          onClick={() => onOpenCredits(user)}
          className="rounded-md border border-amber-500/32 bg-amber-500/16 px-2 py-0.5 text-[10px] font-bold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-amber-500/26"
        >
          Beneficii
        </button>
        {user.listings > 0 && (
          <button
            type="button"
            onClick={() => onViewUserListings(user)}
            className="rounded-md border border-cyan-500/32 bg-cyan-500/12 px-2 py-0.5 text-[10px] font-bold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-cyan-500/22"
          >
            Anunțuri ({user.listings})
          </button>
        )}
        {!targetIsAdminOrOwner && user.status === 'active' && (
          <>
            <button
              type="button"
              onClick={() => setSuspendTarget(user)}
              className="rounded-md border border-amber-500/40 bg-amber-600/22 px-2 py-0.5 text-[10px] font-bold text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-amber-600/34"
            >
              Suspendă
            </button>
            <button
              type="button"
              onClick={() => onMakeAdmin(user.id)}
              className="rounded-md border border-violet-500/34 bg-violet-500/16 px-2 py-0.5 text-[10px] font-bold text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-violet-500/26"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onBan(user.id)}
              className="rounded-md border border-red-500/35 bg-red-500/14 px-2 py-0.5 text-[10px] font-bold text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-red-500/24"
            >
              Blocare
            </button>
          </>
        )}
        {user.status === 'suspended' && (
          <>
            <button
              type="button"
              onClick={() => onUnsuspend(user.id)}
              className="rounded-md border border-emerald-500/34 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-emerald-500/26"
            >
              Ridică
            </button>
            <button
              type="button"
              onClick={() => onBan(user.id)}
              className="rounded-md border border-red-500/35 bg-red-500/14 px-2 py-0.5 text-[10px] font-bold text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-red-500/24"
            >
              Blocare
            </button>
          </>
        )}
        {user.status === 'banned' && (
          <button
            type="button"
            onClick={() => onUnban(user.id)}
            className="rounded-md border border-emerald-500/34 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-emerald-500/26"
          >
            Deblocare
          </button>
        )}
      </div>
    );
  };

  const thBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-0.5 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      {label}
      {sortKey === key && (
        <span className="text-[10px] text-[var(--accent-primary)]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/60 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div
          className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
          aria-hidden
        />
        <p className="text-xs text-[var(--text-tertiary)]">Se încarcă utilizatorii…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-950/15 py-12 text-center">
        <p className="mb-3 text-sm text-red-300/90">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
        >
          Reîncearcă
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/50 py-12 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">Nu există utilizatori înregistrați.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPI strip — compact, „depth” subtil */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'Total conturi', value: stats.total, accent: 'from-violet-500/18' },
          { label: 'Active', value: stats.active, accent: 'from-emerald-500/18' },
          { label: 'Suspendate', value: stats.suspended, accent: 'from-amber-500/16' },
          { label: 'Blocate', value: stats.banned, accent: 'from-red-500/16' },
        ].map((k) => (
          <div
            key={k.label}
            className="group/kpi relative overflow-hidden rounded-lg border border-white/[0.09] bg-gradient-to-br from-[var(--bg-elevated)] to-black/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_36px_-28px_rgba(0,0,0,0.85)] ring-1 ring-black/15 transition hover:-translate-y-px"
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-gradient-to-br ${k.accent} to-transparent opacity-80 blur-2xl transition group-hover/kpi:opacity-100`}
            />
            <div className="relative">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
                {k.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[var(--bg-elevated)]/62 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md flex-1">
          <label className="sr-only">Caută</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută după email, nume sau telefon…"
            className="enterprise-input w-full rounded-md border-white/[0.08] px-3 py-2 text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <p className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
          {filteredSorted.length} din {users.length} afișați
        </p>
      </div>

      {/* Mobile: card list (fără scroll orizontal pe tabel lat) */}
      <div className="space-y-2 md:hidden">
        {filteredSorted.map((user) => {
          const expanded = expandedUserId === user.id;
          return (
            <div
              key={user.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleRow(user.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleRow(user.id);
                }
              }}
              className={`rounded-xl border p-3 text-left shadow-[0_12px_36px_-28px_rgba(0,0,0,0.75)] transition-colors ${
                expanded
                  ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/[0.07] ring-1 ring-[var(--accent-primary)]/20'
                  : 'border-white/[0.09] bg-[var(--bg-elevated)]/70 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-semibold leading-snug text-[var(--text-primary)]">
                    {user.email}
                  </div>
                  {user.name ? (
                    <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{user.name}</div>
                  ) : null}
                </div>
                <StatusBadge user={user} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                <div>
                  <dt className="text-[var(--text-muted)]">Rol</dt>
                  <dd className="font-medium">{ROLE_LABEL[user.role] ?? user.role}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Încredere</dt>
                  <dd className="tabular-nums font-medium">{user.trustScore}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Anunțuri</dt>
                  <dd className="tabular-nums font-medium">{user.listings}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Înregistrat</dt>
                  <dd className="text-[10px] leading-tight">{fmtDate(user.createdAt)}</dd>
                </div>
              </dl>
              <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                <span className="tabular-nums font-medium">{user.credits} RON</span>
                <span className="text-[var(--text-muted)]"> · −{user.discount}% · {user.freePromotions} promo</span>
              </div>
              <div className="mt-3 border-t border-white/[0.06] pt-3" onClick={(e) => e.stopPropagation()}>
                {renderUserActions(user)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: tabel */}
      <div className="hidden overflow-hidden rounded-lg border border-white/[0.09] bg-[var(--bg-elevated)]/52 shadow-[0_22px_50px_-40px_rgba(124,92,246,0.45)] ring-1 ring-black/25 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-white/[0.07] bg-[color-mix(in_oklab,var(--bg-elevated)_94%,transparent)] backdrop-blur-md">
              <tr>
                <th className="px-3 py-2">{thBtn('email', 'Utilizator')}</th>
                <th className="px-3 py-2">{thBtn('role', 'Rol')}</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">{thBtn('trust', 'Încredere')}</th>
                <th className="px-3 py-2">{thBtn('listings', 'Anunțuri')}</th>
                <th className="px-3 py-2">Beneficii</th>
                <th className="px-3 py-2">{thBtn('created', 'Înregistrat')}</th>
                <th className="px-3 py-2 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredSorted.map((user) => {
                const expanded = expandedUserId === user.id;
                return (
                  <tr
                    key={user.id}
                    className={`cursor-pointer transition-colors ${
                      expanded ? 'bg-[var(--accent-primary)]/[0.07]' : 'hover:bg-white/[0.025]'
                    }`}
                    onClick={() => onToggleRow(user.id)}
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="text-[13px] font-semibold leading-tight text-[var(--text-primary)]">{user.email}</div>
                      {user.name && (
                        <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-tertiary)]">{user.name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium text-[var(--text-secondary)]">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums font-medium text-[var(--text-secondary)]">
                      {user.trustScore}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums font-medium text-[var(--text-secondary)]">
                      {user.listings > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewUserListings(user);
                          }}
                          title="Deschide lista de anunțuri și instrumente de moderare"
                          className="font-semibold text-cyan-300/95 underline decoration-cyan-500/45 underline-offset-2 transition hover:text-cyan-200"
                        >
                          {user.listings}
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted)]">0</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 align-top text-[11px] leading-snug text-[var(--text-secondary)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-1">
                        <div className="tabular-nums font-medium">{user.credits} RON</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          −{user.discount}% · {user.freePromotions} promo
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenCredits(user)}
                          className="rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/24"
                        >
                          Modifică
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-[11px] text-[var(--text-tertiary)]">
                      {fmtDate(user.createdAt)}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      {renderUserActions(user)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-md border border-white/[0.05] bg-black/20 px-2.5 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
        Rând pentru detaliu · <strong className="text-[var(--text-secondary)]">Anunțuri</strong> /{' '}
        <strong className="text-[var(--text-secondary)]">Anunțuri (N)</strong> · panoul de listă ·{' '}
        <strong className="text-[var(--text-secondary)]">Beneficii</strong> / <strong className="text-[var(--text-secondary)]">Modifică</strong>.
      </p>

      {/* Suspend modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Suspendare temporară</h3>
            <p className="mb-4 text-sm text-[var(--text-tertiary)]">{suspendTarget.email}</p>
            <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Durată (ore)</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {[6, 24, 72, 168, 720].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSuspendHours(h)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    suspendHours === h
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-100'
                      : 'border-white/[0.08] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)]'
                  }`}
                >
                  {h < 48 ? `${h}h` : h === 168 ? '7 zile' : h === 720 ? '30 zile' : `${h}h`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={8760}
              value={suspendHours}
              onChange={(e) => setSuspendHours(Number(e.target.value) || 24)}
              className="enterprise-input mb-4 w-full px-3 py-2 text-sm"
            />
            <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Motiv (obligatoriu)</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="enterprise-input mb-4 w-full resize-y px-3 py-2 text-sm"
              placeholder="Ex: încălcări repetate ale regulamentului…"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendReason('');
                }}
                className="rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={suspendBusy || suspendReason.trim().length < 3}
                onClick={async () => {
                  setSuspendBusy(true);
                  try {
                    await onSuspend(suspendTarget.id, suspendHours, suspendReason.trim());
                    setSuspendTarget(null);
                    setSuspendReason('');
                  } finally {
                    setSuspendBusy(false);
                  }
                }}
                className="rounded-xl bg-amber-600/90 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
              >
                {suspendBusy ? 'Se aplică…' : 'Confirmă suspendarea'}
              </button>
            </div>
          </div>
          <button type="button" className="absolute inset-0 -z-10" aria-label="Închide" onClick={() => setSuspendTarget(null)} />
        </div>
      )}
    </div>
  );
}
