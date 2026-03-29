"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { ALL_CATEGORIES } from "@/lib/carData";
import { SearchBar } from "@/app/components/composite";
import { Button, Card, Badge } from "@/app/components/ui";
import { StatsStripSafe } from "@/app/components/enterprise";
import { TrustBadges } from "@/app/components/enterprise";

export default function HomePage() {
  const router = useRouter();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number> | null>(null);
  const [categoryCountsError, setCategoryCountsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats/by-category", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setCategoryCounts({});
            setCategoryCountsError(true);
          }
          return;
        }
        const data = (await res.json()) as { counts?: Record<string, number> };
        if (!cancelled) {
          setCategoryCounts(data.counts ?? {});
          setCategoryCountsError(false);
        }
      } catch {
        if (!cancelled) {
          setCategoryCounts({});
          setCategoryCountsError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryData: { [key: string]: { icon: string; color: string } } = {
    "Auto, moto și ambarcațiuni": { icon: "🚗", color: "from-blue-500 to-blue-700" },
    "Imobiliare": { icon: "🏠", color: "from-green-500 to-green-700" },
    "Electronice și electrocasnice": { icon: "💻", color: "from-purple-500 to-purple-700" },
    "Modă și frumusețe": { icon: "👗", color: "from-pink-500 to-pink-700" },
    "Casă și grădină": { icon: "🛋️", color: "from-amber-500 to-amber-700" },
    "Sport, timp liber și artă": { icon: "⚽", color: "from-red-500 to-red-700" },
    "Copii și bebeluși": { icon: "🧸", color: "from-yellow-400 to-yellow-600" },
    "Animale de companie": { icon: "🐾", color: "from-orange-500 to-orange-700" },
    "Locuri de muncă": { icon: "💼", color: "from-slate-500 to-slate-700" },
    "Servicii și afaceri": { icon: "🔧", color: "from-cyan-500 to-cyan-700" },
    "Agricultură": { icon: "🌾", color: "from-lime-500 to-lime-700" },
    "Altele": { icon: "📦", color: "from-gray-500 to-gray-700" },
  };

  const popularCategories = new Set([
    "Auto, moto și ambarcațiuni",
    "Imobiliare",
    "Electronice și electrocasnice",
    "Modă și frumusețe",
    "Casă și grădină",
    "Locuri de muncă"
  ]);

  const handleSearch = (query: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (category) params.append('category', category);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0F1117]">
        {/* Hero Section */}
        <section className="relative flex min-h-[640px] items-center justify-center overflow-hidden pt-12 pb-10 md:pt-16 md:pb-14">
          {/* Background depth — subtle, non-interactive */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_58%)]" />
            <div
              className="absolute left-1/2 top-[12%] h-[min(380px,48vh)] w-[min(820px,100vw)] -translate-x-1/2 rounded-full bg-primary-600/[0.06] blur-[88px]"
              aria-hidden
            />
            <div
              className="absolute right-[8%] top-[20%] h-56 w-56 rounded-full bg-primary-500/[0.04] blur-3xl md:h-72 md:w-72"
              aria-hidden
            />
            {/* Signature abstract layer — ultra-low opacity, non-interactive */}
            <div
              className="absolute -left-[8%] top-[18%] h-[min(420px,55vh)] w-[min(340px,42vw)] -rotate-[19deg] rounded-[42%] bg-gradient-to-br from-primary-400/[0.045] via-primary-600/[0.02] to-transparent blur-[90px]"
              aria-hidden
            />
            <div
              className="absolute -right-[6%] bottom-[8%] h-[min(360px,45vh)] w-[min(400px,48vw)] rotate-[14deg] rounded-[38%] bg-gradient-to-tl from-secondary-400/[0.035] via-secondary-500/[0.018] to-transparent blur-[100px]"
              aria-hidden
            />
            <div
              className="absolute left-1/2 top-[48%] h-[min(200px,24vh)] w-[min(720px,96vw)] -translate-x-1/2 rounded-[100%] bg-primary-500/[0.025] blur-[110px]"
              aria-hidden
            />
          </div>

          <div className="relative z-[1] mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            {/* Title — focal point with soft radial behind copy */}
            <div className="mb-16 text-center md:mb-20">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#161B22]/90 px-4 py-2 text-sm text-white/85 backdrop-blur-sm md:mb-10">
                <span className="inline-block h-2 w-2 rounded-full bg-primary-400/80" />
                Platformă enterprise pentru anunțuri verificate
              </div>
              <div className="relative mx-auto max-w-4xl px-2">
                <div
                  className="pointer-events-none absolute left-1/2 top-[42%] h-[min(220px,28vh)] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-400/[0.09] blur-[72px]"
                  aria-hidden
                />
                <h1 className="relative z-[1] mb-8 text-4xl font-bold leading-[1.1] tracking-tight text-white md:mb-10 md:text-5xl lg:text-[3.2rem]">
                  Găsește rapid{" "}
                  <span className="bg-gradient-to-r from-primary-50 via-primary-300 to-primary-700 bg-clip-text text-transparent">
                    oportunitățile potrivite
                  </span>
                  <br />
                  <span className="mt-1 inline-block text-[0.92em] font-semibold text-white/[0.66] md:text-[0.9em]">
                    în toată România, cu încredere
                  </span>
                </h1>
              </div>
              <p className="mx-auto mt-2 max-w-2xl border-t border-white/[0.06] pt-8 text-base leading-relaxed text-white/55 md:text-lg md:pt-10">
                Anunțuri verificate, filtre inteligente și protecție anti-fraudă — în toată România.
              </p>
            </div>

            {/* Search Box - NEW DESIGN SYSTEM */}
            <div className="mx-auto mb-10 max-w-4xl md:mb-12">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Caută mașini, apartamente, telefoane..."
                categories={ALL_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                showCategory
              />
            </div>

            {/* Trust strip — minimal inline */}
            <div
              className="mx-auto mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-x-7 gap-y-2.5 px-2 text-[11px] font-medium tracking-wide text-white/38 md:gap-x-10 md:text-xs md:text-white/42"
              aria-label="Semnale de încredere"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-primary-400/55 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Anunțuri verificate
              </span>
              <span className="hidden h-3 w-px bg-white/[0.08] sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-primary-400/55 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-1.757-1.985L13 11l-4-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Protecție anti-fraudă
              </span>
              <span className="hidden h-3 w-px bg-white/[0.08] sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-primary-400/55 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Răspuns rapid
              </span>
              <span className="hidden h-3 w-px bg-white/[0.08] sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-primary-400/55 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Suport dedicat
              </span>
            </div>

            {/* Auto Verification - Prime Focus */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="relative overflow-hidden rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-indigo-950/95 p-5 md:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.20),transparent_45%)] pointer-events-none" />
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <span>🛡️</span>
                      Verificări Auto Premium
                    </h3>
                    <Badge outlined pill className="px-3 py-1 text-cyan-200 border-cyan-300/40">
                      Recomandat înainte de cumpărare
                    </Badge>
                  </div>
                  <p className="text-white/75 mb-4">
                    Verifică istoricul mașinii, kilometrajul și semnalele de risc direct din dashboard, în 1 click.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <a
                      href="https://www.carvertical.com/ro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between px-4 py-3 rounded-xl bg-cyan-500/15 border border-cyan-300/35 text-cyan-100 font-semibold hover:bg-cyan-500/25 transition-all"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>🔎</span>
                        CarVertical
                      </span>
                      <span aria-hidden>↗</span>
                    </a>
                    <a
                      href="https://apps.rarom.ro/autopass-client"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-500/15 border border-indigo-300/35 text-indigo-100 font-semibold hover:bg-indigo-500/25 transition-all"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>🏛️</span>
                        RAR AutoPass
                      </span>
                      <span aria-hidden>↗</span>
                    </a>
                    <Link
                      href="/listings?category=Auto%2C%20moto%20%C8%99i%20ambarca%C8%9Biuni"
                      className="inline-flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 transition-all"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>📊</span>
                        Compară oferte auto
                      </span>
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badges - Enterprise Safety Layer */}
            <TrustBadges />

            {/* Quick Actions - NEW DESIGN SYSTEM */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link href="/listings/new">
                <Button variant="primary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adaugă Anunț
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary" size="lg">
                  Conectează-te
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Grid - NEW DESIGN SYSTEM */}
        <section className="max-w-7xl mx-auto px-4 py-28">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-5 text-white">
              Toate{" "}
              <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                categoriile
              </span>
            </h2>
            <p className="text-gray-400 text-xl">
              Răsfoiește anunțuri pe categorii — numerele afișate sunt din baza de date (anunțuri active).
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ALL_CATEGORIES.map((categoryName) => {
              const data = categoryData[categoryName] || { icon: "📦", color: "from-gray-500 to-gray-700" };
              const isPopular = popularCategories.has(categoryName);
              const count =
                categoryCounts === null ? null : (categoryCounts[categoryName] ?? 0);
              const countLabel =
                categoryCountsError && categoryCounts !== null
                  ? "Indisponibil"
                  : count === null
                    ? "…"
                    : count.toLocaleString("ro-RO");

              return (
                <Link
                  key={categoryName}
                  href={`/listings?category=${encodeURIComponent(categoryName)}`}
                >
                  <Card 
                    variant="elevated" 
                    interactive
                    className="group relative h-64 sm:h-72 overflow-hidden transition-all duration-normal ease-premium"
                  >
                    {/* Category background — gradient only (no external stock imagery) */}
                    <div
                      aria-hidden
                      className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-95 transition-transform duration-normal ease-premium group-hover:scale-105`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/15" />
                    
                    {/* Content */}
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1A1D24]/70 backdrop-blur-sm border border-white/10">
                          <span className="text-2xl">{data.icon}</span>
                        </div>
                        {isPopular && (
                          <Badge variant="warning" className="font-bold">
                            POPULAR
                          </Badge>
                        )}
                      </div>

                      <div>
                        <Badge variant="primary" size="sm" className="mb-4">
                          <span className="inline-block h-2 w-2 rounded-full bg-white mr-2" />
                          {countLabel} anunțuri
                        </Badge>

                        <h3 className="mb-3 text-xl font-black text-white transition-colors duration-normal ease-premium group-hover:text-[#8AB4FF]">
                          {categoryName}
                        </h3>

                        <div className="flex items-center gap-3 text-sm text-gray-200">
                          <span className="opacity-80">Vezi anunțuri</span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors duration-normal ease-premium group-hover:bg-white/10">
                            <svg className="w-4 h-4 text-[#8AB4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Stats Section - NEW DESIGN SYSTEM */}
        <StatsStripSafe />

        {/* Features Section - NEW DESIGN SYSTEM */}
        <section className="max-w-7xl mx-auto px-4 py-28 pb-40">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              De ce{" "}
              <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                ClickAnunț?
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-white mb-3">Rapid și Ușor</h3>
                <p className="text-gray-400">Publică un anunț în doar 2 minute. Interfață simplă și intuitivă.</p>
              </Card.Body>
            </Card>
            
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-white mb-3">Sigur și Verificat</h3>
                <p className="text-gray-400">Toate anunțurile sunt moderate. Protejăm datele tale personale.</p>
              </Card.Body>
            </Card>
            
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">💯</div>
                <h3 className="text-xl font-bold text-white mb-3">100% Gratuit</h3>
                <p className="text-gray-400">Fără costuri ascunse. Publică nelimitat, fără abonament.</p>
              </Card.Body>
            </Card>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
