# SEO Audit Report — ClickAnunț / auto-platform

**Datum:** 2026-05-10  
**Stack:** Next.js 16 App Router · TypeScript · Prisma PostgreSQL  

## Executive summary

The marketplace had basic metadata on the root layout, default `robots.ts`, and a single dynamic `app/sitemap.ts` that inlined up to **50,000** listing URLs. Listing detail pages (`/listings/[id]`) relied on JSON-LD in a nested layout (`ListingJsonLd`) but **lacked per-URL `<title>` / OpenGraph** from the server (the page itself is a client component). The homepage is a **client component**, so it could not export `generateMetadata`. There were **no stable SEO landing URLs** for category × city (only query parameters on `/listings`). These patterns limit crawl efficiency, snippet quality, and scale (sitemap size, DB offset cost).

This report informed the implementation in the same PR: centralized SEO utilities, server metadata, sitemap index + chunked listing sitemaps, `robots.txt` improvements, and optional `/{categorySlug}/{citySlug}` routes.

---

## 1. App Router structure (relevant to SEO)

| Area | Finding |
|------|---------|
| `app/layout.tsx` | Solid global `metadata`, `metadataBase`, optional Google verification. |
| `app/page.tsx` | **Client-only** — no `generateMetadata` possible without splitting. |
| `app/listings/page.tsx` | Server component shell; **no metadata**; uses `ListingsView` (client). |
| `app/listings/[id]/page.tsx` | **Client-only**; SEO depends on parent layout. |
| `app/listings/[id]/layout.tsx` | Injects `ListingJsonLd` (Product) — good; **missing** `generateMetadata`. |
| `app/head.tsx` | Legacy-style head with Organization + LocalBusiness JSON-LD — **duplicates** risk vs new global graph. |
| Admin / auth / dashboard | Correctly excluded from casual indexing via `robots`; should stay `noindex` where appropriate. |

---

## 2. Metadata implementation

- **Duplication:** Title patterns mix `ClickAnunț` vs `ClickAnunt`; `lib/seo.ts` existed with a function named `generateMetadata` (easy to confuse with Next’s export).
- **Canonicals:** Root uses `alternates.canonical: '/'` (good with `metadataBase`).
- **Gaps:** No dynamic titles for search/listing/browse combinations; listing pages need server-side title/description from DB.

---

## 3. `robots.txt` (`app/robots.ts`)

- Uses `MetadataRoute.Robots` — correct for App Router.
- **Googlebot `crawlDelay`:** Google largely ignores `Crawl-delay`; kept conservative rules for other bots.
- **Disallow list:** Should include more private surfaces (`/auth/*`, `/test-login`, `/ui-demo`, `/car-catalog-demo`, messages, etc.) — addressed in implementation.

---

## 4. Sitemap (`app/sitemap.ts` before change)

- **Single URL set** including up to 50k listings — works for mid-size but not “millions”.
- **Risk:** Large XML responses, memory, and Prisma `take: 50000` without chunking.
- **Static pages:** Only `/` and `/listings` — missing `/about`, `/contact`, `/terms`, etc.

---

## 5. Structured data

- **Product JSON-LD** on listing detail is present (layout).
- **Missing / partial:** Consistent `WebSite` + `SearchAction`, `BreadcrumbList` on listings, `Organization` single source (avoid duplicates from `head.tsx`).

---

## 6. Dynamic routes & indexing

- **Listing IDs** are UUIDs — stable URLs; good.
- **Category/city** only as query params — weak for landing pages and internal linking; **programmatic SEO paths** added as `/{slug}/{citySlug}` with validation (unknown slugs → 404).

---

## 7. Performance & CWV (SEO-related)

- **Images:** `next.config.ts` uses `remotePatterns`, WebP/AVIF — good baseline.
- **LCP/CLS:** Not fully measurable in static audit; listing page is client-heavy — recommendations: keep hero image priorities, avoid layout shift in JSON-LD-only changes (no layout change in this pass).
- **Global Cache-Control** on `/:path*` may be aggressive for HTML; out of scope unless agreed (could affect freshness).

---

## 8. Environment & production URLs

- Mix of `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` in codebase — **centralized** in `lib/site-url.ts` to avoid wrong canonicals (e.g. localhost in prod if misconfigured).

---

## 9. Prioritized recommendations (implemented vs future)

| Priority | Item | Status |
|----------|------|--------|
| P0 | Chunked listing sitemaps + index | Implemented (`/sitemap-listings.xml` + chunk files) |
| P0 | Server `generateMetadata` for listing detail | Implemented in `listings/[id]/layout.tsx` |
| P0 | Homepage metadata via server wrapper | Implemented (`HomePageClient` + server `page.tsx`) |
| P1 | Category × city SEO routes | Implemented under `app/[categorySlug]/[citySlug]/` |
| P1 | Global WebSite + SearchAction + Organization | Implemented (`GlobalJsonLd`) |
| P1 | `robots.txt` hardening | Implemented |
| P2 | Subcategory path segments | Future (optional third segment) |
| P2 | Hreflang | Future (if multi-language) |

---

## 10. Out of scope (per project rules)

- Stripe / payments / webhooks  
- Authentication logic  
- Messaging / admin business logic  
- Prisma schema migrations for SEO-only fields  

---

*End of audit — see `SEO_IMPLEMENTATION_REPORT.md` for the applied changes.*
