"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { CATEGORY_LABEL_BY_CANONICAL_SLUG } from "@/lib/seo/market-paths";
import { isAdminStaffRole } from "@/lib/is-admin-staff-client";
import { CLICKANUNT_AUTH_SESSION_EVENT } from "@/lib/auth-session-events";
import { validateServerAuthSession } from "@/lib/admin-fetch";

function NavIconHome({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 sm:h-6 sm:w-6 ${active ? "text-orange-400" : "text-zinc-500"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      strokeWidth={active ? 2.1 : 1.85}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function NavIconGrid({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 sm:h-6 sm:w-6 ${active ? "text-orange-400" : "text-zinc-500"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      strokeWidth={active ? 2.1 : 1.85}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function NavIconUser({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 sm:h-6 sm:w-6 ${active ? "text-orange-400" : "text-zinc-500"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      strokeWidth={active ? 2.1 : 1.85}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function NavIconShield({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 sm:h-6 sm:w-6 ${active ? "text-violet-300" : "text-zinc-500"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      strokeWidth={active ? 2.1 : 1.85}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

/** Tab bar mobil — dock sticlă premium (dark); 4 destinații pentru admin/owner. */
export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [showAdminTab, setShowAdminTab] = useState(false);

  const syncStaffFromServer = useCallback(async () => {
    try {
      const session = await validateServerAuthSession();
      if (!session.ok || !session.user) {
        setShowAdminTab(false);
        return;
      }
      setShowAdminTab(isAdminStaffRole(session.user.role));
    } catch {
      setShowAdminTab(false);
    }
  }, []);

  useEffect(() => {
    void syncStaffFromServer();
    const onAuth = () => {
      void syncStaffFromServer();
    };
    window.addEventListener("storage", onAuth);
    window.addEventListener("focus", onAuth);
    window.addEventListener(CLICKANUNT_AUTH_SESSION_EVENT, onAuth);
    return () => {
      window.removeEventListener("storage", onAuth);
      window.removeEventListener("focus", onAuth);
      window.removeEventListener(CLICKANUNT_AUTH_SESSION_EVENT, onAuth);
    };
  }, [syncStaffFromServer]);

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const isPublishFlow =
    pathname === "/listings/new" || pathname.startsWith("/listings/new/");
  const isListingEdit = /^\/listings\/[^/]+\/edit\/?$/.test(pathname);

  // useLayoutEffect: attribute must be set before paint so mobile CSS + E2E
  // do not observe a gap where cleanup deleted the flag between remounts.
  useLayoutEffect(() => {
    const hide = isPublishFlow || isListingEdit;
    document.documentElement.dataset.hideMobileBottomNav = hide ? "1" : "0";
  }, [isPublishFlow, isListingEdit]);

  if (isPublishFlow || isListingEdit) {
    return null;
  }

  const catalogActive =
    pathname === "/listings" ||
    pathname.startsWith("/listings/") ||
    (Boolean(firstSegment) &&
      Object.prototype.hasOwnProperty.call(
        CATEGORY_LABEL_BY_CANONICAL_SLUG,
        firstSegment
      ));

  const adminAreaActive = pathname.startsWith("/admin");

  const items: {
    href: string;
    label: string;
    active: boolean;
    icon: (on: boolean) => ReactNode;
  }[] = [
    { href: "/", label: "Acasă", active: pathname === "/", icon: (on) => <NavIconHome active={on} /> },
    { href: "/listings", label: "Catalog", active: catalogActive, icon: (on) => <NavIconGrid active={on} /> },
    ...(showAdminTab
      ? [
          {
            href: "/admin/moderation",
            label: "Moderare",
            active: adminAreaActive,
            icon: (on: boolean) => <NavIconShield active={on} />,
          } as const,
        ]
      : []),
    {
      href: "/dashboard",
      label: "Cont",
      active:
        (pathname.startsWith("/dashboard") || pathname.startsWith("/auth")) &&
        (!showAdminTab || !adminAreaActive),
      icon: (on) => <NavIconUser active={on} />,
    },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] md:hidden"
      aria-label="Navigare rapidă"
    >
      <div
        className={`pointer-events-auto relative mx-auto w-full ${showAdminTab ? "max-w-md sm:max-w-lg" : "max-w-sm sm:max-w-md"}`}
      >
        <div
          className="pointer-events-none absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent sm:left-8 sm:right-8"
          aria-hidden
        />
        <ul className="flex w-full items-stretch justify-between gap-0.5 rounded-[14px] border border-white/[0.09] bg-zinc-950/[0.88] px-1 py-1 shadow-[0_-6px_28px_-4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:gap-1 sm:rounded-2xl sm:px-1.5 sm:py-1.5">
          {items.map((item) => {
            const on = item.active;
            return (
              <li key={item.href} className="flex min-w-0 flex-1 basis-0 justify-center">
                <Link
                  href={item.href}
                  prefetch={false}
                  className={`group relative flex min-h-[2.65rem] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-[11px] px-1 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:min-h-[3rem] sm:gap-1 sm:rounded-xl ${
                    on
                      ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-orange-500/20"
                      : "text-zinc-500 active:scale-[0.98] hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  <span className={`flex shrink-0 items-center justify-center ${on ? "" : ""}`}>
                    {item.icon(on)}
                  </span>
                  <span
                    className={`w-full px-0.5 text-center text-[9px] font-semibold leading-none tracking-tight sm:text-[10px] ${
                      on ? "font-bold text-white" : "font-medium text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
