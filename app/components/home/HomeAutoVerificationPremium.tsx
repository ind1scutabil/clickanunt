import type { ReactNode } from "react";
import Link from "next/link";

const transition =
  "transition-[transform,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

const shell =
  `rounded-xl border border-white/[0.055] bg-[rgba(7,8,12,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_40px_-32px_rgba(0,0,0,0.85)] backdrop-blur-[14px] md:rounded-2xl ${transition}`;

const badgeSoft =
  "rounded border border-white/[0.06] bg-white/[0.025] px-1 py-px text-[7px] font-medium uppercase tracking-[0.14em] text-zinc-400/80 md:rounded-[5px] md:px-1.5 md:py-px md:text-[8px]";

/**
 * Verificări auto — flat horizontal enterprise tiles (Porsche / Linear / premium marketplace).
 */
export function HomeAutoVerificationPremium() {
  return (
    <div className={`${shell} px-3 py-2 md:px-6 md:py-3`} role="region" aria-labelledby="home-auto-verify-heading">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 md:mb-2 md:gap-2.5">
        <h2 id="home-auto-verify-heading" className="text-[12px] font-semibold tracking-[-0.01em] text-white/95 md:text-[15px]">
          Verificări auto înainte de plată
        </h2>
        <span className={`${badgeSoft} border-white/[0.07] bg-white/[0.03] text-zinc-400/80`}>Recomandat</span>
      </div>

      <p className="mb-1 text-[8px] leading-snug text-zinc-400 md:mb-2.5 md:text-[11px] md:leading-[1.45]">
        Istoric extern și registre oficiale — același standard de încredere ca la dealeri premium.
      </p>

      <div className="flex flex-col gap-1.5 md:flex-row md:items-stretch md:gap-4 lg:gap-5">
        <ServiceRow
          href="https://www.carvertical.com/ro"
          external
          accent="emerald"
          icon={
            <svg className="h-3 w-3 md:h-[15px] md:w-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          title="CarVertical"
          description="Raport istoric vehicul · VIN"
          badge="Extern"
        />

        <ServiceRow
          href="https://apps.rarom.ro/autopass-client"
          external
          accent="sky"
          icon={
            <svg className="h-3 w-3 md:h-[15px] md:w-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
          title="RAR AutoPass"
          description="Registru auto · verificare oficială"
          badge="Extern"
        />

        <ServiceRow
          href="/auto"
          accent="orange"
          icon={
            <svg className="h-3 w-3 md:h-[15px] md:w-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          title="Oferte auto în ClickAnunț"
          description="Catalog live · filtre rapide"
          badge="Live"
          isInternal
        />
      </div>
    </div>
  );
}

type Accent = "emerald" | "sky" | "orange";

/** Muted icon wells: neutral glass + hairline edge tint (no RGB fill glow). */
const accentRing: Record<Accent, string> = {
  emerald:
    "border-white/[0.06] bg-white/[0.025] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-inset ring-white/[0.03]",
  sky:
    "border-white/[0.06] bg-white/[0.025] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-inset ring-white/[0.03]",
  orange:
    "border-white/[0.06] bg-white/[0.025] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-inset ring-white/[0.03]",
};

/** Hairline left edge light (inset) — reads as premium wayfinding, not RGB panels. */
const accentInset: Record<Accent, string> = {
  emerald:
    "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.03),inset_2.5px_0_0_rgba(52,211,153,0.1),inset_-20px_0_40px_-36px_rgba(52,211,153,0.04)]",
  sky: "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.03),inset_2.5px_0_0_rgba(125,211,252,0.1),inset_-20px_0_40px_-36px_rgba(125,211,252,0.035)]",
  orange:
    "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.03),inset_2.5px_0_0_rgba(251,146,60,0.11),inset_-20px_0_40px_-36px_rgba(251,146,60,0.04)]",
};

const accentInsetHover: Record<Accent, string> = {
  emerald:
    "hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.038),inset_2.5px_0_0_rgba(52,211,153,0.13),inset_-20px_0_44px_-34px_rgba(52,211,153,0.055),0_10px_36px_-22px_rgba(0,0,0,0.72)]",
  sky: "hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.038),inset_2.5px_0_0_rgba(125,211,252,0.13),inset_-20px_0_44px_-34px_rgba(125,211,252,0.05),0_10px_36px_-22px_rgba(0,0,0,0.72)]",
  orange:
    "hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.038),inset_2.5px_0_0_rgba(251,146,60,0.14),inset_-20px_0_44px_-34px_rgba(251,146,60,0.055),0_10px_36px_-22px_rgba(0,0,0,0.72)]",
};

function ServiceRow({
  href,
  external,
  accent,
  icon,
  title,
  description,
  badge,
  isInternal,
}: {
  href: string;
  external?: boolean;
  accent: Accent;
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
  isInternal?: boolean;
}) {
  const inner = (
    <>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border md:h-9 md:w-9 ${accentRing[accent]}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 py-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-px md:items-center md:gap-x-2 md:gap-y-0">
          <span className="text-[10.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-white/92 md:text-[12.5px]">{title}</span>
          <span className={badgeSoft}>{badge}</span>
        </div>
        <p className="mt-px text-[8px] leading-[1.25] text-zinc-400 md:mt-0.5 md:text-[10px] md:leading-snug">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center self-center pl-0.5 md:pl-1">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] text-zinc-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] group-hover:border-white/[0.09] group-hover:bg-white/[0.035] group-hover:text-zinc-400 md:h-7 md:w-7"
          aria-hidden
        >
          <svg
            className="h-2.5 w-2.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-px md:h-3 md:w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </>
  );

  const cardClass = `group flex min-h-[56px] w-full min-w-0 flex-row items-center gap-2.5 rounded-lg border border-white/[0.055] bg-[rgba(255,255,255,0.018)] px-3 py-1.5 backdrop-blur-[10px] md:min-h-[100px] md:max-w-[420px] md:flex-1 md:basis-0 md:gap-3.5 md:rounded-[14px] md:px-4 md:py-2 lg:min-h-[106px] ${accentInset[accent]} ${accentInsetHover[accent]} ${transition} hover:-translate-y-px hover:border-white/[0.072] hover:bg-[rgba(255,255,255,0.026)]`;

  if (isInternal) {
    return (
      <Link href={href} prefetch={false} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
      {inner}
    </a>
  );
}
