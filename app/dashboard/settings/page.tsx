"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useCallback, useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";

type Toast = { kind: "success" | "error" | "info"; text: string } | null;

type MeResponse = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  location?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    newMessages: boolean;
    priceAlerts: boolean;
    newsletter: boolean;
  };
  twoFactorEnabled?: boolean;
};

const defaultNotif = {
  email: true,
  sms: false,
  push: true,
  newMessages: true,
  priceAlerts: true,
  newsletter: false,
};

async function authHeaders(): Promise<HeadersInit> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [notifications, setNotifications] = useState(defaultNotif);

  const [pwd, setPwd] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 5200);
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/auth/login?redirect=/dashboard/settings");
          return;
        }
        const res = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: await authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!silent) {
            showToast({ kind: "error", text: data.error || "Nu s-au putut încărca datele" });
          }
          return;
        }
        setMe(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setNotifications({ ...defaultNotif, ...data.notificationPreferences });
      } catch {
        if (!silent) {
          showToast({ kind: "error", text: "Eroare de rețea" });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router, showToast]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    showToast({ kind: "info", text: "Se salvează…" });
    try {
      const csrf = await getCsrfToken();
      if (!csrf) {
        showToast({ kind: "error", text: "Nu s-a putut obține tokenul CSRF" });
        return;
      }
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { ...(await authHeaders()), "x-csrf-token": csrf },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ kind: "error", text: data.error || "Eroare la salvare" });
        return;
      }
      const u = data.user;
      setMe((prev) => (prev ? { ...prev, ...u } : u));
      const raw = localStorage.getItem("user");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsed,
              name: u.name,
              phone: u.phone,
            })
          );
        } catch {
          /* ignore */
        }
      }
      showToast({ kind: "success", text: "Salvat cu succes." });
      await load({ silent: true });
    } catch {
      showToast({ kind: "error", text: "Eroare de rețea. Încearcă din nou." });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    showToast({ kind: "info", text: "Se salvează preferințele…" });
    try {
      const csrf = await getCsrfToken();
      if (!csrf) {
        showToast({ kind: "error", text: "Nu s-a putut obține tokenul CSRF" });
        return;
      }
      const res = await fetch("/api/users/me/notification-preferences", {
        method: "PATCH",
        credentials: "include",
        headers: { ...(await authHeaders()), "x-csrf-token": csrf },
        body: JSON.stringify(notifications),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ kind: "error", text: data.error || "Eroare la salvare" });
        return;
      }
      if (data.notifications) setNotifications(data.notifications);
      showToast({ kind: "success", text: "Preferințe salvate." });
      await load({ silent: true });
    } catch {
      showToast({ kind: "error", text: "Eroare de rețea. Încearcă din nou." });
    } finally {
      setSavingNotif(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) {
      showToast({ kind: "error", text: "Parola nouă și confirmarea nu coincid." });
      return;
    }
    setSavingPwd(true);
    showToast({ kind: "info", text: "Se actualizează parola…" });
    try {
      const csrf = await getCsrfToken();
      if (!csrf) {
        showToast({ kind: "error", text: "Nu s-a putut obține tokenul CSRF" });
        return;
      }
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { ...(await authHeaders()), "x-csrf-token": csrf },
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.next,
          confirmPassword: pwd.confirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = String(data.error || "");
        if (res.status === 401 && /actual|incorect|incorrect/i.test(err)) {
          showToast({ kind: "error", text: "Parola actuală este greșită." });
        } else if (/Parola|password|weak|simbol|cifră|literă/i.test(err)) {
          showToast({ kind: "error", text: "Parola nouă este prea slabă sau invalidă." });
        } else {
          showToast({ kind: "error", text: err || "Eroare la schimbarea parolei." });
        }
        return;
      }
      setPwd({ current: "", next: "", confirm: "" });
      showToast({ kind: "success", text: "Parola a fost schimbată." });
    } catch {
      showToast({ kind: "error", text: "Eroare, încearcă din nou." });
    } finally {
      setSavingPwd(false);
    }
  };

  const deactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    showToast({ kind: "info", text: "Se procesează…" });
    try {
      const csrf = await getCsrfToken();
      if (!csrf) {
        showToast({ kind: "error", text: "Nu s-a putut obține tokenul CSRF" });
        return;
      }
      const res = await fetch("/api/users/me/deactivate", {
        method: "POST",
        credentials: "include",
        headers: { ...(await authHeaders()), "x-csrf-token": csrf },
        body: JSON.stringify({ confirmText: deleteConfirm.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ kind: "error", text: data.error || "Operațiune eșuată" });
        return;
      }
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      showToast({ kind: "success", text: data.message || "Cont dezactivat." });
      setTimeout(() => router.push("/"), 1200);
    } catch {
      showToast({ kind: "error", text: "Eroare, încearcă din nou." });
    } finally {
      setDeleting(false);
    }
  };

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-32">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
            aria-hidden
          />
          <p className="mt-4 text-sm text-[var(--text-tertiary)]">Se încarcă setările…</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-600/12 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-[5.25rem] sm:px-6 sm:pt-24">
        {toast && (
          <div
            role="status"
            className={`fixed bottom-6 left-1/2 z-[300] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md sm:left-auto sm:right-6 sm:translate-x-0 ${
              toast.kind === "success"
                ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-50"
                : toast.kind === "info"
                  ? "border-sky-500/35 bg-slate-900/95 text-sky-50"
                  : "border-red-500/40 bg-red-950/90 text-red-50"
            }`}
          >
            {toast.text}
          </div>
        )}

        <header className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Cont
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Setări cont
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-tertiary)]">
            Date personale, securitate și preferințe de notificare — sincronizate cu contul tău.
          </p>
        </header>

        <form
          onSubmit={saveProfile}
          className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-8"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Date personale
          </h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Numele și telefonul sunt stocate în profil; locația este salvată în preferințele contului.
          </p>
          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Nume complet
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm text-[var(--text-primary)] outline-none ring-0 transition placeholder:text-[var(--text-muted)] focus:border-orange-500/45"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Email
              </label>
              <input
                value={me?.email || ""}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-[var(--text-tertiary)]"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Schimbarea emailului se face prin suport.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Telefon
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm outline-none focus:border-orange-500/45"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Locație (oraș / regiune)
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm outline-none focus:border-orange-500/45"
                placeholder="ex. București"
              />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-md transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProfile ? "Se salvează…" : "Salvează datele"}
            </button>
            <button
              type="button"
              onClick={() => void load({ silent: true })}
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-medium text-[var(--text-secondary)] transition hover:border-white/20 hover:text-[var(--text-primary)]"
            >
              Renunță la modificări
            </button>
          </div>
        </form>

        <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-6 backdrop-blur-sm sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" aria-hidden />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Notificări</h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Preferințe salvate în cont; livrarea efectivă depinde de canal (email/SMS/push).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveNotifications()}
              disabled={savingNotif}
              className="mt-2 inline-flex shrink-0 items-center justify-center rounded-xl border border-orange-500/35 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/20 disabled:opacity-50 sm:mt-0"
            >
              {savingNotif ? "Se salvează…" : "Salvează preferințele"}
            </button>
          </div>
          <ul className="mt-6 divide-y divide-white/[0.06]">
            {(
              [
                ["email", "Notificări email", "Recomandări și mesaje pe email"],
                ["sms", "SMS", "Alerte pe telefon (dacă serviciul e activ)"],
                ["push", "Push în browser", "Notificări în timp real în browser"],
                ["newMessages", "Mesaje noi", "Când primești mesaje în platformă"],
                ["priceAlerts", "Alerte preț", "Schimbări de preț la anunțurile urmărite"],
                ["newsletter", "Newsletter", "Oferte și noutăți ocazionale"],
              ] as const
            ).map(([key, title, desc]) => (
              <li key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{title}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications[key]}
                  onClick={() => toggle(key)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                    notifications[key] ? "bg-orange-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      notifications[key] ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 p-6 backdrop-blur-sm sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" aria-hidden />
          <h2 className="text-lg font-semibold">Securitate</h2>
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                Parola actuală
              </label>
              <input
                type="password"
                value={pwd.current}
                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm outline-none focus:border-orange-500/45"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                Parola nouă
              </label>
              <input
                type="password"
                value={pwd.next}
                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm outline-none focus:border-orange-500/45"
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Min. 8 caractere, literă mare, literă mică, cifră și simbol (!@#$%^&*).
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                Confirmă parola nouă
              </label>
              <input
                type="password"
                value={pwd.confirm}
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm outline-none focus:border-orange-500/45"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={savingPwd}
              className="w-full rounded-xl bg-white/[0.08] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/[0.12] disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {savingPwd ? "Se actualizează…" : "Schimbă parola"}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-white/[0.08] bg-black/25 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Autentificare în doi pași</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Stare curentă:{" "}
                  <strong className="text-[var(--text-primary)]">
                    {me?.twoFactorEnabled ? "activată" : "dezactivată"}
                  </strong>
                  . Activarea/dezactivarea 2FA din această pagină va fi disponibilă în curând; până
                  atunci folosește fluxul existent la autentificare dacă e configurat de echipă.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-red-200">Dezactivare cont</h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Contul va fi marcat ca inactiv (soft-delete). Nu te vei mai putea autentifica. Acțiunea
            nu șterge anunțurile din baza de date — pentru ștergere completă GDPR, contactează
            suportul.
          </p>
          <form onSubmit={deactivate} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-red-200/90">
                Tastează exact <span className="font-mono">ȘTERGE</span> pentru a confirma
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full rounded-xl border border-red-500/25 bg-black/40 px-4 py-3 text-sm text-red-50 outline-none focus:border-red-400/50"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={deleting || deleteConfirm.trim() !== "ȘTERGE"}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-6"
            >
              {deleting ? "Se procesează…" : "Dezactivează contul"}
            </button>
          </form>
        </section>

        <div className="mt-10">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-orange-400 transition hover:text-orange-300"
          >
            ← Înapoi la dashboard
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
