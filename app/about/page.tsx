import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Despre ClickAnunț — platformă de anunțuri gratuite",
  description:
    "Despre ClickAnunț (clickanunt.ro): marketplace românesc de anunțuri gratuite — auto, imobiliare, electronice, joburi și servicii.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="enterprise-page-bg enterprise-mesh min-h-screen text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <header className="mb-14 text-center md:mb-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Transparență · Siguranță · Gratuit
          </p>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            Despre <span className="text-primary-400">ClickAnunț</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
            ClickAnunț (www.clickanunt.ro) este marketplace-ul românesc de anunțuri gratuite — conectăm
            cumpărători și vânzători într-un mediu clar și protejat.
          </p>
        </header>

        <section className="enterprise-card enterprise-card-hover mb-16 rounded-3xl p-8 md:p-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white md:text-3xl">Misiunea noastră</h2>
          <div className="max-w-3xl space-y-5 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            <p>
              ClickAnunț — scris și fără diacritice ca <strong>clickanunt</strong> / clickanunt.ro — este
              platforma noastră de anunțuri, nu un nume incomplet și nu un alt site de clasificate. Am creat-o
              ca românii să poată vinde și cumpăra modern: mașini, locuințe, electronice, joburi și servicii.
            </p>
            <p>
              Punem accent pe transparență și siguranță: anunțurile trec prin verificări, iar utilizatorii au
              la dispoziție instrumente clare pentru raportare și suport.
            </p>
          </div>
        </section>

        <section className="mb-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {[
            {
              title: "Siguranță",
              body: "Verificări și moderare pentru a reduce riscurile și conținutul nepotrivit.",
              icon: "shield",
            },
            {
              title: "Viteză",
              body: "Publicare simplă, fluxuri scurte și interfață optimizată pe mobil și desktop.",
              icon: "bolt",
            },
            {
              title: "Acces gratuit",
              body: "Publicare de bază fără costuri ascunse — transparență totală asupra opțiunilor plătite.",
              icon: "coin",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="enterprise-card enterprise-card-hover rounded-2xl p-8 transition-colors hover:border-white/15"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                {item.icon === "shield" && (
                  <svg className="h-6 w-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                {item.icon === "bolt" && (
                  <svg className="h-6 w-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {item.icon === "coin" && (
                  <svg className="h-6 w-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">{item.title}</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="enterprise-card rounded-3xl p-10 text-center md:p-12">
          <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">Echipa & contact</h2>
          <p className="mx-auto mb-8 max-w-xl text-[var(--text-secondary)]">
            Suntem dedicați îmbunătățirii continue a platformei. Pentru întrebări sau propuneri, suntem la un
            click distanță.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-primary-500/25 bg-primary-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
          >
            Contactează-ne
          </Link>
        </section>
      </main>
    </div>
  );
}
