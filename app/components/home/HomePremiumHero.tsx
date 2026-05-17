"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HERO_DESKTOP_AVIF, HERO_DESKTOP_URL } from "@/lib/hero-asset-urls";

type HomePremiumHeroProps = {
  heroSearch: string;
  setHeroSearch: (v: string) => void;
  onSubmitSearch: (query: string) => void;
  trendingTerms: string[];
  onTrendingClick: (term: string) => void;
  listingsCta: string;
  verificationSlot?: ReactNode;
  previewsSlot?: ReactNode;
};

/**
 * Hero media uses a fixed-height slot (`--hero-bg-h`) so `object-cover` does not re-crop when
 * previews or dynamic content change the section height after load.
 */
export function HomePremiumHero({
  heroSearch,
  setHeroSearch,
  onSubmitSearch,
  trendingTerms,
  onTrendingClick,
  listingsCta,
  verificationSlot,
  previewsSlot,
}: HomePremiumHeroProps) {
  return (
    <section
      className="hero-premium-root relative isolate flex w-full max-w-[100vw] flex-col overflow-hidden border-b border-white/[0.06] max-md:min-h-[var(--hero-bg-h)]"
      aria-labelledby="home-hero-heading"
    >
      {/* Media + atmosphere only within fixed hero height — never stretches with previews below */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-[var(--hero-bg-h)] min-h-0 overflow-hidden bg-[#07090d]">
        <picture className="absolute inset-0 block min-h-0 w-full">
          {/* One landscape master on all breakpoints — avoids blurry portrait-crop on narrow phones */}
          <source srcSet={HERO_DESKTOP_AVIF} type="image/avif" />
          <source srcSet={HERO_DESKTOP_URL} type="image/webp" />
          <img
            src={HERO_DESKTOP_URL}
            alt=""
            width={2560}
            height={1440}
            sizes="100vw"
            decoding="async"
            fetchPriority="high"
            className="hero-premium-photo absolute inset-0 h-full w-full max-h-none max-w-none"
            aria-hidden
          />
        </picture>
        <div className="hero-premium-grain absolute inset-0 z-[1]" aria-hidden />
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-[var(--hero-bg-h)] shadow-[inset_0_0_88px_rgba(0,0,0,0.18)] max-md:shadow-[inset_0_0_64px_rgba(0,0,0,0.26)]"
        aria-hidden
      />

      <div
        className="hero-overlay-responsive pointer-events-none absolute left-0 right-0 top-0 z-[2] h-[var(--hero-bg-h)]"
        aria-hidden
      />

      <div className="hero-verification-scrim" aria-hidden />

      <div className="hero-premium-shell relative z-[3] mx-auto flex min-h-[var(--hero-bg-h)] w-full max-w-7xl flex-1 flex-col justify-center px-3 pb-6 pt-5 max-md:flex-1 max-md:justify-between max-md:px-2.5 max-md:pb-3 max-md:pt-3 sm:px-4 md:min-h-[var(--hero-bg-h)] md:justify-center md:px-6 md:pb-10 md:pt-8 lg:px-8">
        <div className="grid w-full min-h-0 flex-1 grid-cols-1 items-center gap-6 max-md:min-h-0 max-md:items-stretch max-md:gap-0 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="relative flex w-full min-h-0 max-md:flex-1 max-md:flex-col md:col-span-6 lg:col-span-5 xl:col-span-5">
            <div
              className="hero-heading-readability-glow max-md:top-[-0.5rem] max-md:h-[8.5rem] max-md:max-w-[18rem]"
              aria-hidden
            />
            <div className="hero-premium-mobile-stack relative z-10 flex min-h-0 w-full max-w-xl flex-col max-md:flex-1 md:max-w-none">
              <div className="shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 max-md:text-[10px] max-md:tracking-[0.14em]">
                Piață din România
              </p>
              <h1
                id="home-hero-heading"
                className="mt-2 max-md:mt-1.5 text-[1.1875rem] font-semibold leading-[1.18] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-[1.3125rem] sm:leading-[1.14] md:text-[2rem] md:leading-[1.12] lg:text-[2.125rem]"
              >
                Găsești rapid anunțuri active
              </h1>
              <p className="mt-2 hidden max-w-lg text-[12px] leading-snug text-white/92 sm:text-[13px] md:mt-2 md:block md:text-[0.9375rem] md:leading-relaxed">
                Mașini, locuințe, electronice, joburi și servicii. Căutare rapidă, anunțuri moderate,
                contact în platformă.
              </p>

              <form
                className="mt-3 w-full max-w-xl max-md:mt-2 max-md:max-w-[15rem] sm:max-md:max-w-[16.25rem] md:mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitSearch(heroSearch.trim());
                }}
                role="search"
              >
                <label htmlFor="home-hero-search" className="sr-only">
                  Caută în anunțuri
                </label>
                <div className="overflow-hidden rounded-full border border-white/[0.12] bg-[#1a1d24]/95 shadow-[0_8px_32px_-14px_rgba(0,0,0,0.65)] focus-within:border-orange-500/40 focus-within:ring-2 focus-within:ring-orange-500/20 max-md:rounded-full max-md:shadow-[0_4px_18px_-10px_rgba(0,0,0,0.5)] max-md:focus-within:ring-1 md:rounded-full">
                  <div className="flex items-center gap-1 py-1.5 pl-4 pr-1.5 max-md:gap-0.5 max-md:py-0.5 max-md:pl-2 max-md:pr-0.5">
                    <span className="flex shrink-0 items-center text-zinc-500" aria-hidden>
                      <svg className="h-5 w-5 max-md:h-3.5 max-md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                    <input
                      id="home-hero-search"
                      type="search"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      placeholder="Ex. BMW X5, apartament Cluj, iPhone 15…"
                      autoComplete="off"
                      className="min-h-[2.5rem] min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 max-md:min-h-[1.75rem] max-md:py-0 max-md:text-[11px] max-md:placeholder:text-[10px]"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-[#ff5a00] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e65200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 max-md:px-2 max-md:py-0.5 max-md:text-[10px] max-md:font-semibold"
                      aria-label="Caută"
                    >
                      Caută
                    </button>
                  </div>
                </div>
              </form>
              </div>

              {/* Mobile: elastic gap so BMW stays visible; CTAs sit just above tab bar zone */}
              <div className="hero-premium-mobile-gap max-md:flex-1 max-md:min-h-[0.75rem]" aria-hidden />

              <div className="mt-3 hidden max-w-xl md:mt-4 md:block">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 max-md:mb-1.5 max-md:text-[9px] max-md:tracking-[0.14em]">
                  Popular acum
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto scroll-pl-1 pb-1 [scrollbar-width:thin] max-md:gap-1.5 md:flex-wrap md:overflow-visible">
                  {trendingTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => onTrendingClick(term)}
                      className="shrink-0 rounded-full border border-white/[0.1] bg-zinc-900/80 px-3 py-1.5 text-left text-[12px] font-medium text-zinc-100 transition-colors hover:border-white/[0.18] hover:bg-zinc-800/90 max-md:px-2 max-md:py-1 max-md:text-[11px]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="mt-3 hidden max-w-xl flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.08] pt-3 text-[11px] text-zinc-300 md:mt-4 md:flex md:pt-4"
                aria-label="Siguranță"
              >
                <span className="inline-flex items-center gap-1.5 max-md:gap-1">
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 max-md:h-3 max-md:w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Moderare anunțuri
                </span>
                <span className="inline-flex items-center gap-1.5 max-md:gap-1">
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 max-md:h-3 max-md:w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Raportezi rapid
                </span>
              </div>

              <div className="hero-premium-mobile-cta mt-4 flex w-full max-w-xl shrink-0 flex-col gap-2.5 max-md:gap-2 max-md:border-t max-md:border-white/[0.08] max-md:pt-3 max-md:pb-1 md:mt-5 md:flex-row md:flex-wrap md:items-center">
                <Link
                  href="/listings"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#ff5a00] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e65200] max-md:h-9 max-md:px-4 max-md:text-xs md:w-auto md:min-w-[13rem]"
                >
                  <span className="tabular-nums">{listingsCta}</span>
                  <span className="ml-1" aria-hidden>
                    →
                  </span>
                </Link>
                <Link
                  href="/listings/new"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/[0.2] bg-zinc-900/60 px-6 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.28] hover:bg-zinc-800/70 max-md:h-9 max-md:px-4 max-md:text-xs md:w-auto"
                >
                  Publică anunț
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-11 items-center justify-center px-2 text-sm font-medium text-zinc-400/90 underline-offset-[3px] transition-colors hover:text-zinc-100 hover:underline max-md:mx-auto max-md:min-h-[2rem] max-md:px-4 max-md:py-1.5 max-md:text-[11px] md:px-3"
                >
                  Autentificare
                </Link>
              </div>

              <p className="mt-3 hidden max-w-xl text-[11px] leading-snug text-zinc-500 md:mt-3 md:block">
                Date din catalogul activ — nu afișăm statistici inventate.
              </p>
            </div>
          </div>

          <div className="hidden md:col-span-6 md:block lg:col-span-7" aria-hidden />
        </div>
      </div>

      {verificationSlot ? (
        <div className="relative z-[5] -mt-0.5 md:-mt-1.5">
          <div className="mx-auto max-w-7xl px-3 pb-5 max-md:px-2.5 max-md:pb-5 sm:px-4 md:px-6 md:pb-6 lg:px-8">
            {verificationSlot}
          </div>
        </div>
      ) : null}

      {previewsSlot ? (
        <div className="relative z-[4] border-t border-white/[0.04] bg-gradient-to-b from-[#090b10] via-[#0a0c11] to-[#0c0d10]">
          <div className="mx-auto max-w-7xl px-3 pb-8 pt-6 sm:px-4 md:px-6 md:pb-10 md:pt-7 lg:px-8">
            {previewsSlot}
          </div>
        </div>
      ) : null}
    </section>
  );
}
