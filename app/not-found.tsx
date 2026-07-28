import Link from "next/link";

/**
 * Branded 404 — Romanian copy, recovery links, no false bottom-nav state claims.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-[#030304] px-4 py-16 text-center"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(251,146,60,0.1),transparent_55%)]"
        aria-hidden
      />
      <p className="relative text-sm font-semibold uppercase tracking-[0.18em] text-orange-400/90">
        ClickAnunț
      </p>
      <p className="relative mt-4 text-6xl font-black tabular-nums text-zinc-100 sm:text-7xl">
        404
      </p>
      <h1 className="relative mt-4 max-w-lg text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Pagina nu a fost găsită
      </h1>
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
        Linkul este greșit, anunțul nu mai este public sau pagina a fost mutată.
        Poți reveni la catalog sau la căutare.
      </p>
      <div className="relative mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#ff5a00] px-5 text-sm font-semibold text-white transition hover:bg-[#e65200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
        >
          Acasă
        </Link>
        <Link
          href="/listings"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/80 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
        >
          Catalog anunțuri
        </Link>
        <Link
          href="/listings?q="
          className="inline-flex h-11 items-center justify-center rounded-lg border border-transparent px-5 text-sm font-semibold text-orange-300/95 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
        >
          Caută
        </Link>
      </div>
    </main>
  );
}
