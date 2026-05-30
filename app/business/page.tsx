"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { HERO_DESKTOP_AVIF, HERO_DESKTOP_URL } from "@/lib/hero-asset-urls";
import { COMPANY_CONFIG, isCompanyLegalDetailsPublic } from "@/lib/company-config";

const showCompanyLegal = isCompanyLegalDetailsPublic();
const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE?.trim();

const ICON = "h-6 w-6";

const SEGMENTS = ["Dealeri auto", "Agenții imobiliare", "Companii"] as const;

const STATS = [
  { value: "1000+", label: "Dealeri activi" },
  { value: "50K+", label: "Anunțuri business" },
  { value: "95%", label: "Rată de conversie" },
  { value: "24/7", label: "Suport dedicat" },
] as const;

const BENEFITS = [
  {
    title: "Promovare Maximă",
    description: "Anunțurile tale apar în top rezultate și pe homepage cu badge \"Top Dealer\".",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l3.75 3.75L21.75 6M21.75 6h-5.25M21.75 6v5.25" />
      </svg>
    ),
  },
  {
    title: "Cont Verificat",
    description: "Badge \"Verificat\" pe toate anunțurile pentru încredere maximă de la clienți.",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 2.25 2.25 4.5-4.5m3.342-2.69a3 3 0 0 0-1.902-1.902l-2.69-.84a3 3 0 0 0-2.1 0l-2.69.84A3 3 0 0 0 5.81 7.59l-.84 2.69a3 3 0 0 0 0 2.1l.84 2.69a3 3 0 0 0 1.902 1.902l2.69.84a3 3 0 0 0 2.1 0l2.69-.84a3 3 0 0 0 1.902-1.902l.84-2.69a3 3 0 0 0 0-2.1l-.84-2.69Z" />
      </svg>
    ),
  },
  {
    title: "Dashboard Avansat",
    description: "Statistici detaliate: vizualizări, leads, conversii, rapoarte exportabile.",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: "Publicare Rapidă",
    description: "Încarcă anunțuri în bulk via CSV sau API. Economisești ore de muncă.",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    title: "Lead Management",
    description: "Toate întrebările și apelurile într-un singur loc, cu notificări instant.",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
      </svg>
    ),
  },
  {
    title: "Facturare Simplificată",
    description: "Factură lunară centralizată, export compatibil cu contabilitatea ta.",
    icon: (
      <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3.75h3M9 17.25h6M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
] as const;

const PLANS = [
  {
    name: "Dealer Start",
    price: "299",
    period: "lună",
    description: "Perfect pentru dealeri mici sau noi pe platformă",
    features: [
      "Până la 25 anunțuri active",
      "Badge \"Dealer Verificat\"",
      "Dashboard de bază",
      "Suport email",
      "Promovare în top 10",
    ],
    cta: "Începe Acum",
    popular: false,
  },
  {
    name: "Dealer Pro",
    price: "799",
    period: "lună",
    description: "Cea mai populară alegere pentru dealeri activi",
    features: [
      "Până la 100 anunțuri active",
      "Badge \"Top Dealer\"",
      "Dashboard avansat + Analytics",
      "Suport prioritar (telefon + email)",
      "Promovare în top 3",
      "API Access pentru bulk upload",
      "Lead notifications instant",
    ],
    cta: "Alege Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "la cerere",
    description: "Soluție personalizată pentru companii mari și rețele",
    features: [
      "Anunțuri nelimitate",
      "Branding personalizat",
      "Integrare API completă",
      "Dedicated account manager",
      "White-label opțional",
      "SLA garantat 99.9%",
      "Raportare customizată",
    ],
    cta: "Contactează-ne",
    popular: false,
  },
] as const;

export default function BusinessPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0c0d10] text-zinc-100">
        {/* Hero — asymmetric, cinematic, reuses homepage automotive media (read-only reference) */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06]" aria-labelledby="business-hero-heading">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#07090d]" aria-hidden>
            <picture className="absolute inset-0 block h-full w-full">
              <source srcSet={HERO_DESKTOP_AVIF} type="image/avif" />
              <source srcSet={HERO_DESKTOP_URL} type="image/webp" />
              <img
                src={HERO_DESKTOP_URL}
                alt=""
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-[78%_center]"
                aria-hidden
              />
            </picture>
            <div className="hero-premium-grain absolute inset-0 z-[1]" />
          </div>
          {/* readability scrims (left for copy + bottom fade into next section) */}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/90 to-[#0b0c10]/10" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-[#0c0d10] via-[#0b0c10]/45 to-transparent" aria-hidden />

          <div className="relative z-[3] mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 md:pb-44 md:pt-32 lg:px-8 lg:pt-36">
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
              <div className="md:col-span-8 lg:col-span-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
                  Pentru Business &amp; Dealeri
                </p>
                <h1
                  id="business-hero-heading"
                  className="mt-4 max-w-xl text-3xl font-semibold leading-[1.07] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:text-4xl lg:text-[2.75rem]"
                >
                  Crește-ți vânzările cu{" "}
                  <span className="text-orange-500">ClickAnunt Business</span>
                </h1>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-200 md:text-[1.0625rem]">
                  Pachete dedicate pentru dealeri auto, agenții imobiliare și companii care vând în volum.
                  Promovare maximă, conturi verificate și dashboard profesional.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {SEGMENTS.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/[0.1] bg-zinc-900/70 px-3 py-1.5 text-[12px] font-medium text-zinc-200 backdrop-blur-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="#plans"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff5a00] px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e65200]"
                  >
                    Vezi Pachete
                  </Link>
                  <Link
                    href="#contact"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/[0.2] bg-zinc-900/60 px-7 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.28] hover:bg-zinc-800/70"
                  >
                    Contactează Echipa
                  </Link>
                </div>

                <div className="mt-8 max-w-md border-t border-white/[0.08] pt-5">
                  <p className="text-[11px] leading-snug text-zinc-400">
                    Parte din marketplace-ul ClickAnunt — aceeași platformă, un strat dedicat pentru business.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats — integrated band overlapping the hero (homepage verification-card pattern) */}
        <div className="relative z-[5] -mt-12 md:-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0e1116]/80 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5 md:px-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  ClickAnunt Business în marketplace
                </p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,90,0,0.6)]" aria-hidden />
                  Ecosistem unificat
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/[0.07] md:grid-cols-4">
                {STATS.map((stat, i) => (
                  <div key={i} className="bg-[#0d0f13] px-6 py-5 md:py-6">
                    <div className="text-[1.75rem] font-semibold leading-none tracking-tight text-white md:text-[2rem]">{stat.value}</div>
                    <div className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-zinc-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">Avantaje</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl">
                De ce ClickAnunt Business?
              </h2>
              <p className="mt-3 text-base text-zinc-400 md:text-lg">Avantaje competitive pentru afacerea ta</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((benefit, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-white/[0.055] bg-gradient-to-b from-white/[0.05] to-[rgb(16,18,24)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/[0.09] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    {benefit.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-white">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section
          id="plans"
          className="border-y border-white/[0.06] bg-gradient-to-b from-[#0e1015] via-[#0c0e13] to-[#0a0c10] py-20 md:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">Pachete</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl">Alege Pachetul Potrivit</h2>
              <p className="mt-3 text-base text-zinc-400 md:text-lg">
                Flexibilitate și scalabilitate pentru orice dimensiune de business
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <div
                  key={i}
                  className={`relative flex flex-col rounded-2xl border p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 ${
                    plan.popular
                      ? "border-orange-500/40 bg-gradient-to-b from-[#1b1712] to-[rgb(16,18,24)] ring-1 ring-orange-500/30"
                      : "border-white/[0.055] bg-gradient-to-b from-white/[0.05] to-[rgb(16,18,24)] hover:border-white/[0.09]"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute right-5 top-5 inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300">
                      Cel mai popular
                    </span>
                  )}

                  <h3 className="text-xl font-semibold tracking-tight text-white">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-zinc-400">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold tracking-tight text-white">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-sm text-zinc-500">RON/{plan.period}</span>}
                  </div>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-orange-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 pt-1">
                    <button
                      type="button"
                      className={
                        plan.popular
                          ? "inline-flex h-11 w-full items-center justify-center rounded-full bg-[#ff5a00] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e65200]"
                          : "inline-flex h-11 w-full items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] px-6 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.22] hover:bg-white/[0.07]"
                      }
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-zinc-500">
                Toate prețurile sunt exprimate în RON fără TVA. Facturare lunară sau anuală (2 luni gratuit).
              </p>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section id="contact" className="py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-[rgb(16,18,24)] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-14">
              <div
                className="pointer-events-none absolute -top-20 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,90,0,0.10),_transparent_70%)] blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Hai să creștem împreună!</h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
                  Echipa noastră te ajută să configurezi contul de business în mai puțin de 24h. Fără contracte pe termen lung.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff5a00] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#e65200]"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    business@clickanunt.ro
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/[0.2] bg-zinc-900/60 px-7 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.28] hover:bg-zinc-800/70"
                    onClick={
                      showCompanyLegal && companyPhone
                        ? () => {
                            window.location.href = `tel:${companyPhone.replace(/\s/g, "")}`;
                          }
                        : showCompanyLegal
                          ? () => {
                              window.location.href = `mailto:${COMPANY_CONFIG.emails.support}`;
                            }
                          : undefined
                    }
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {showCompanyLegal && companyPhone
                      ? companyPhone
                      : showCompanyLegal
                        ? "Suport email"
                        : "+40 XXX XXX XXX"}
                  </button>
                </div>
                <p className="mt-6 text-sm text-zinc-500">Program: Luni - Vineri, 09:00 - 18:00</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
