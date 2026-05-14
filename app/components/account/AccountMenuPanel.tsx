"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type AccountMenuSurface = "dropdown" | "sheet";

type Props = {
  surface: AccountMenuSurface;
  pathname: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  userRole: string | null;
  userEmail: string | null;
  accountBadge: string;
  unreadCount: number;
  onNavigate: () => void;
  onLogout: () => void;
};

type NavItem = {
  key: string;
  href: string;
  label: string;
  surfaces: AccountMenuSurface[];
  isActive: (pathname: string) => boolean;
  unreadBadge?: boolean;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    key: "messages",
    href: "/messages",
    label: "Mesaje",
    surfaces: ["sheet"],
    isActive: (p) => p.startsWith("/messages"),
    unreadBadge: true,
    icon: (
      <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    key: "favorites",
    href: "/favorites",
    label: "Favorite",
    surfaces: ["sheet"],
    isActive: (p) => p.startsWith("/favorites"),
    icon: (
      <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: "catalog",
    href: "/listings",
    label: "Toate anunțurile",
    surfaces: ["sheet"],
    isActive: (p) => p.startsWith("/listings") && !p.startsWith("/listings/new"),
    icon: <span className="text-lg leading-none">📋</span>,
  },
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Contul meu",
    surfaces: ["dropdown", "sheet"],
    isActive: (p) => p === "/dashboard" || p === "/dashboard/",
    icon: (
      <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: "my-listings",
    href: "/dashboard/listings",
    label: "Anunțurile mele",
    surfaces: ["dropdown", "sheet"],
    isActive: (p) => p.startsWith("/dashboard/listings"),
    icon: (
      <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: "settings",
    href: "/dashboard/settings",
    label: "Setări",
    surfaces: ["dropdown", "sheet"],
    isActive: (p) => p.startsWith("/dashboard/settings"),
    icon: (
      <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function linkClasses(surface: AccountMenuSurface, active: boolean): string {
  if (surface === "sheet") {
    return `flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-colors ${
      active
        ? "bg-orange-500/[0.12] text-white ring-1 ring-inset ring-orange-500/25"
        : "text-zinc-200 hover:bg-white/[0.06] hover:text-white"
    }`;
  }
  return `flex items-center gap-3 px-5 py-3 text-sm font-medium transition ${
    active
      ? "bg-orange-500/[0.08] text-white ring-1 ring-inset ring-orange-500/20"
      : "text-zinc-200 hover:bg-white/[0.06] hover:text-white"
  }`;
}

export default function AccountMenuPanel({
  surface,
  pathname,
  isLoggedIn,
  isAdmin,
  userRole,
  userEmail,
  accountBadge,
  unreadCount,
  onNavigate,
  onLogout,
}: Props) {
  const items = navItems.filter((item) => item.surfaces.includes(surface));

  const staffBadge = isLoggedIn && (isAdmin || userRole === "owner");

  return (
    <>
      <div
        className={
          surface === "sheet"
            ? "mx-2 mb-2 rounded-lg border border-zinc-800/90 bg-zinc-950/90 px-4 py-3 shadow-sm backdrop-blur-md"
            : "border-b border-white/[0.08] bg-zinc-900/50 px-5 py-4"
        }
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Stare sesiune</div>
        <div className="mt-1.5 text-sm font-semibold tracking-tight text-zinc-100">
          {isLoggedIn ? userEmail || "Utilizator autentificat" : "Nu ești autentificat"}
        </div>
        <div
          className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            surface === "sheet" ? "text-xs font-black" : ""
          } ${
            isLoggedIn
              ? staffBadge
                ? "border-violet-500/40 bg-violet-950/70 text-violet-200 ring-1 ring-violet-500/20"
                : "border-emerald-500/40 bg-emerald-950/70 text-emerald-200 ring-1 ring-emerald-500/20"
              : "border-zinc-600 bg-zinc-800/90 text-zinc-400"
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" />
          {accountBadge}
        </div>
      </div>

      {!isLoggedIn && (
        <>
          <Link
            href="/auth/login"
            className={
              surface === "sheet"
                ? "mx-2 flex items-center justify-center gap-2 rounded-lg border-b border-white/[0.06] px-4 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                : "flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.06]"
            }
            onClick={onNavigate}
          >
            {surface === "sheet" ? (
              <>
                <span aria-hidden>🔐</span>
                <span>Autentificare</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Autentificare</span>
              </>
            )}
          </Link>
          <Link
            href="/auth/signup"
            className={
              surface === "sheet"
                ? "mx-2 flex items-center justify-center gap-2 rounded-lg border-b border-white/[0.06] px-4 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                : "flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.06]"
            }
            onClick={onNavigate}
          >
            {surface === "sheet" ? (
              <>
                <span aria-hidden>📝</span>
                <span>Înregistrare</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Înregistrare</span>
              </>
            )}
          </Link>
        </>
      )}

      <div className={surface === "sheet" ? "space-y-0.5 px-1 pt-1" : "border-b border-white/[0.06] py-1"}>
        {surface === "dropdown" ? (
          <p className="px-5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Cont</p>
        ) : null}
        {items.map((item) => {
          const active = item.isActive(pathname);
          const content = (
            <>
              {item.icon}
              <span className={surface === "sheet" && item.unreadBadge ? "flex flex-1 items-center justify-between gap-2" : ""}>
                {item.label}
                {item.unreadBadge && unreadCount > 0 ? (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </>
          );
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={item.key === "messages" || item.key === "favorites" ? false : undefined}
              className={linkClasses(surface, active)}
              onClick={onNavigate}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {surface === "sheet" && isLoggedIn ? (
        <div className="px-2 pt-2">
          <Link
            href="/listings/new"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 rounded-lg border border-orange-600/40 bg-orange-600 px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Adaugă anunț gratuit</span>
          </Link>
        </div>
      ) : null}

      {isAdmin && (
        <div className={surface === "sheet" ? "border-t border-white/[0.08] bg-black/25 px-2 pt-3" : "border-t border-white/[0.08] bg-black/25"}>
          <p
            className={
              surface === "sheet"
                ? "px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80"
                : "px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80"
            }
          >
            Administrare
          </p>
          <div className={surface === "sheet" ? "space-y-1.5 px-1 pb-1" : ""}>
            <Link
              href="/admin/moderation"
              className={
                surface === "sheet"
                  ? `mx-1 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      pathname.startsWith("/admin/moderation")
                        ? "border-orange-500/35 bg-violet-950/70 text-white ring-1 ring-orange-500/20"
                        : "border-violet-500/25 bg-violet-950/45 text-violet-100 hover:border-orange-500/25 hover:bg-violet-900/50"
                    }`
                  : `mx-2 mb-1 flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/moderation")
                        ? "border-orange-500/35 bg-violet-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-orange-500/20"
                        : "border-violet-500/25 bg-violet-950/50 text-violet-100 hover:border-orange-500/25 hover:bg-violet-900/55"
                    }`
              }
              onClick={onNavigate}
            >
              {surface === "sheet" ? <span className="text-lg">🛡️</span> : null}
              {surface === "dropdown" ? (
                <svg className="h-5 w-5 shrink-0 text-violet-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : null}
              <span>Admin — Moderare</span>
            </Link>
            <Link
              href="/admin/dashboard"
              className={
                surface === "sheet"
                  ? `mx-1 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/dashboard")
                        ? "border-orange-500/35 bg-violet-950/65 text-white ring-1 ring-orange-500/20"
                        : "border-violet-500/20 bg-violet-950/35 text-violet-100 hover:bg-violet-900/45"
                    }`
                  : `mx-2 mb-1 flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/dashboard")
                        ? "border-orange-500/35 bg-violet-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-orange-500/20"
                        : "border-violet-500/25 bg-violet-950/50 text-violet-100 hover:border-orange-500/25 hover:bg-violet-900/55"
                    }`
              }
              onClick={onNavigate}
            >
              {surface === "sheet" ? <span className="text-lg">📊</span> : null}
              {surface === "dropdown" ? (
                <svg className="h-5 w-5 shrink-0 text-violet-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              ) : null}
              <span>Admin — Dashboard</span>
            </Link>
            <Link
              href="/admin/promotions"
              className={
                surface === "sheet"
                  ? `mx-1 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/promotions")
                        ? "border-orange-500/35 bg-violet-950/65 text-white ring-1 ring-orange-500/20"
                        : "border-violet-500/20 bg-violet-950/35 text-violet-100 hover:bg-violet-900/45"
                    }`
                  : `mx-2 mb-1 flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/promotions")
                        ? "border-orange-500/35 bg-violet-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-orange-500/20"
                        : "border-violet-500/25 bg-violet-950/50 text-violet-100 hover:border-orange-500/25 hover:bg-violet-900/55"
                    }`
              }
              onClick={onNavigate}
            >
              {surface === "sheet" ? <span className="text-lg">💳</span> : null}
              {surface === "dropdown" ? (
                <svg className="h-5 w-5 shrink-0 text-violet-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : null}
              <span>Admin — Promoții</span>
            </Link>
            <Link
              href="/admin/invoices"
              className={
                surface === "sheet"
                  ? `mx-1 mb-1 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/invoices")
                        ? "border-orange-500/35 bg-violet-950/65 text-white ring-1 ring-orange-500/20"
                        : "border-violet-500/20 bg-violet-950/35 text-violet-100 hover:bg-violet-900/45"
                    }`
                  : `mx-2 mb-2 flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                      pathname.startsWith("/admin/invoices")
                        ? "border-orange-500/35 bg-violet-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-orange-500/20"
                        : "border-violet-500/25 bg-violet-950/50 text-violet-100 hover:border-orange-500/25 hover:bg-violet-900/55"
                    }`
              }
              onClick={onNavigate}
            >
              {surface === "sheet" ? <span className="text-lg">📄</span> : null}
              {surface === "dropdown" ? (
                <svg className="h-5 w-5 shrink-0 text-violet-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : null}
              <span>Admin — Facturi</span>
            </Link>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <button
          type="button"
          onClick={() => {
            onNavigate();
            void onLogout();
          }}
          className={
            surface === "sheet"
              ? "sticky bottom-0 z-[1] mt-2 flex w-full items-center justify-center gap-2 border-t border-white/[0.12] bg-[#12151a]/95 px-4 py-3.5 text-center text-sm font-semibold text-red-200 backdrop-blur-md transition hover:bg-red-950/50 hover:text-red-100"
              : "flex w-full items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 text-left text-sm font-medium text-zinc-200 transition hover:bg-red-950/40 hover:text-red-200"
          }
        >
          {surface === "sheet" ? (
            <>
              <span aria-hidden>🚪</span>
              <span>Deconectare</span>
              <span className="sr-only">(Logout)</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Deconectare</span>
              <span className="sr-only">(Logout)</span>
            </>
          )}
        </button>
      )}
    </>
  );
}
