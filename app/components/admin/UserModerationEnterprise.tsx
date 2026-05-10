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
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-red-500/20 text-red-300 border border-red-500/40">
        Blocat
      </span>
    );
  }
  if (user.status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-200 border border-amber-500/40">
        Suspendat
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
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

  const thBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 text-left font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      {label}
      {sortKey === key && (
        <span className="text-xs text-[var(--accent-primary)]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="text-center py-16 rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/60">
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
          aria-hidden
        />
        <p className="text-sm text-[var(--text-tertiary)]">Se încarcă utilizatorii…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 rounded-2xl border border-red-500/25 bg-red-950/15">
        <p className="text-red-300/90 mb-4 text-sm">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
        >
          Reîncearcă
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/50">
        <p className="text-sm text-[var(--text-tertiary)]">Nu există utilizatori înregistrați.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total conturi', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Suspendate', value: stats.suspended },
          { label: 'Blocate', value: stats.banned },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {k.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md flex-1">
          <label className="sr-only">Caută</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută după email, nume sau telefon…"
            className="enterprise-input w-full px-4 py-2.5 text-sm placeholder:text-[var(--text-muted)]"
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {filteredSorted.length} din {users.length} afișați
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/50 shadow-[var(--shadow-md)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[var(--bg-elevated)]">
              <tr>
                <th className="px-4 py-3.5">{thBtn('email', 'Utilizator')}</th>
                <th className="px-4 py-3.5">{thBtn('role', 'Rol')}</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">{thBtn('trust', 'Încredere')}</th>
                <th className="px-4 py-3.5">{thBtn('listings', 'Anunțuri')}</th>
                <th className="px-4 py-3.5">Beneficii</th>
                <th className="px-4 py-3.5">{thBtn('created', 'Înregistrat')}</th>
                <th className="px-4 py-3.5 text-right">Acțiuni rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredSorted.map((user) => {
                const expanded = expandedUserId === user.id;
                const isAdmin = user.role === 'admin' || user.role === 'owner';
                return (
                  <tr
                    key={user.id}
                    className={`cursor-pointer transition-colors ${
                      expanded ? 'bg-[var(--accent-primary)]/[0.08]' : 'hover:bg-white/[0.03]'
                    }`}
                    onClick={() => onToggleRow(user.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-[var(--text-primary)]">{user.email}</div>
                      {user.name && (
                        <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{user.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-[var(--text-secondary)]">
                      {user.trustScore}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-[var(--text-secondary)]">
                      {user.listings > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewUserListings(user);
                          }}
                          title="Deschide lista de anunțuri și instrumente de moderare"
                          className="font-semibold text-cyan-300/95 underline decoration-cyan-500/50 underline-offset-2 transition hover:text-cyan-200"
                        >
                          {user.listings}
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted)]">0</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 align-top text-xs text-[var(--text-secondary)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-1.5">
                        <div className="tabular-nums">{user.credits} RON</div>
                        <div className="text-[var(--text-muted)]">
                          −{user.discount}% · {user.freePromotions} promo
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenCredits(user)}
                          className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/25"
                        >
                          Modifică
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-[var(--text-tertiary)]">
                      {fmtDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenCredits(user)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30"
                        >
                          Beneficii
                        </button>
                        {user.listings > 0 && (
                          <button
                            type="button"
                            onClick={() => onViewUserListings(user)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-200 border border-cyan-500/35 hover:bg-cyan-500/25"
                          >
                            Anunțuri ({user.listings})
                          </button>
                        )}
                        {!isAdmin && user.status === 'active' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSuspendTarget(user)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600/25 text-amber-100 border border-amber-500/40 hover:bg-amber-600/35"
                            >
                              Suspendă
                            </button>
                            <button
                              type="button"
                              onClick={() => onMakeAdmin(user.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-violet-500/20 text-violet-200 border border-violet-500/35"
                            >
                              Admin
                            </button>
                            <button
                              type="button"
                              onClick={() => onBan(user.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-200 border border-red-500/35"
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
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/35"
                            >
                              Ridică suspendare
                            </button>
                            <button
                              type="button"
                              onClick={() => onBan(user.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-200 border border-red-500/35"
                            >
                              Blocare
                            </button>
                          </>
                        )}
                        {user.status === 'banned' && (
                          <button
                            type="button"
                            onClick={() => onUnban(user.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/35"
                          >
                            Deblocare
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="px-1 text-xs text-[var(--text-muted)]">
        Apasă pe rând pentru detalii. Când utilizatorul are anunțuri, <strong className="text-[var(--text-secondary)]">numărul din coloana Anunțuri</strong> și butonul{' '}
        <strong className="text-[var(--text-secondary)]">Anunțuri (N)</strong> deschid panoul și derulează la listă (Vezi / Editează / moderare). Coloana{' '}
        <strong className="text-[var(--text-secondary)]">Beneficii</strong> rezumă creditele; <strong className="text-[var(--text-secondary)]">Modifică</strong> sau butonul violet deschid același dialog de beneficii.
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
