# SEO Visibility Audit — clickanunt.ro

**Date:** 2026-05-19  
**Mode:** Read-only audit (+ live Googlebot checks on production)  
**Production commit at audit:** `24db6b9b` (pagination); local branch may include additional uncommitted SEO patches.

---

## Executive summary

| Area | Status |
|------|--------|
| Public indexability (/, /listings, /auto, /imobiliare, listing details) | **OK** — `index, follow`, HTTP 200 |
| Apex → www | **OK** — 301 to `https://www.clickanunt.ro` |
| Sitemaps | **OK** — index + categories + cities + listings (28) + auto-hubs |
| Listing detail structured data | **Product + Offer + BreadcrumbList** (GSC merchant warnings = non-blocking) |
| `/listings` SSR | **OK** — 24 listing links in HTML; Suspense fallback text still present in stream |
| Hub pages with inventory | **OK** — ItemList + FAQ + breadcrumbs in HTML |
| Empty hubs / thin categories | **noindex** by design (correct) |
| Wrong URL `/electronice-si-electrocasnice` | **404** on prod — canonical slug is `/electronice` |
| Organic scale | **~28 indexable listings** — SEO ceiling is inventory size, not a single bug |

---

## 1. robots.txt

**Source:** `app/robots.ts` (Next.js metadata route)

| Rule | Value |
|------|--------|
| Staging | `Disallow: /` |
| Production allow | `/`, `/listings/`, `/about`, `/contact`, `/business`, `/security` |
| Disallow | `/api/`, `/admin/`, `/dashboard/`, `/auth/`, `/messages/`, listing edit/promote/messages, `/_next/` |
| Sitemaps declared | `sitemap.xml`, `sitemap-categories.xml`, `sitemap-cities.xml`, `sitemap-listings.xml`, `sitemap-auto-hubs.xml` |
| Host | `www.clickanunt.ro` |

**Live:** `https://www.clickanunt.ro/robots.txt` — HTTP 200, allows Googlebot on public paths.

**Note:** Category hubs (`/auto`, `/imobiliare`) rely on default `allow: /` — not explicitly listed but crawlable.

---

## 2. Sitemaps

| URL | Role | Live check |
|-----|------|------------|
| `/sitemap.xml` | Static + legal pages, `/listings` | 200 |
| `/sitemap-categories.xml` | Category + category/city hubs with inventory | 200, DB-driven |
| `/sitemap-cities.xml` | `/auto/{city}` with auto listings | 200 |
| `/sitemap-listings.xml` | Index → `sitemap-listings-0.xml` | 200 |
| `/sitemap-listings-0.xml` | Listing detail URLs | **28** `<loc>` (aligned with active indexable count) |
| `/sitemap-auto-hubs.xml` | Make/model/city auto hubs above thresholds | 200 |

**Listing shards filter:** `seoIndexableListingWhere()` — active, approved, not deleted, not expired.

**Category sitemap filter (pre-patch):** `status: active` + `deletedAt: null` only — **looser** than listing shards (patch aligns to `seoIndexableListingWhere`).

**Not in sitemap:** auth, dashboard, admin, messages, empty hubs, non-approved listings.

---

## 3. Canonical & redirects

| URL | Status | Canonical |
|-----|--------|-----------|
| `https://clickanunt.ro/` | **301** → www | — |
| `https://www.clickanunt.ro/` | 200 | `https://www.clickanunt.ro` |
| `/listings` | 200 | `https://www.clickanunt.ro/listings` |
| `/listings?page=2` | 200 | includes `?page=2` |
| `/auto` | 200 | `https://www.clickanunt.ro/auto` |
| `/imobiliare` | 200 | `https://www.clickanunt.ro/imobiliare` |
| `/listings/{uuid}` (5 samples) | 200 | self-referencing |

**x-robots-tag header:** absent on sampled public pages.

---

## 4. robots meta / noindex

### Indexable (live Googlebot)

| Page | robots meta |
|------|-------------|
| `/` | `index, follow` |
| `/listings` | `index, follow` |
| `/auto` | `index, follow` |
| `/imobiliare` | `index, follow` |
| 5× `/listings/{id}` | `index, follow` |

### Intentionally noindex (live)

| Page | robots | Reason |
|------|--------|--------|
| `/locuri-de-munca` | `noindex, nofollow` | 0 listings (`count === 0`) |
| `/servicii` | `noindex, nofollow` | 0 listings |
| `/imobiliare/bucuresti` | `noindex, nofollow` | 0 listings in city hub |
| `/auto/bucuresti` | `noindex, nofollow` | 0 listings in city hub |
| `/electronice-si-electrocasnice` | **404** + default layout noindex | Invalid slug (not in `CATEGORY_SLUG_ALIASES` on prod) |

### Intentionally noindex (code policy)

- `/auth/*`, `/dashboard/*`, `/admin/*`, `/messages/*`, demos
- Invalid category/city slug
- Hub with `count === 0`
- Listing detail when `!isListingSeoIndexable()` (expired, rejected, non-approved)

---

## 5. Titles & H1 (live sample)

| URL | Title (truncated) | H1 |
|-----|-----------------|-----|
| `/` | ClickAnunt.ro - Anunțuri Auto, Imobiliare… | ClickAnunt — Anunțuri gratuite în România |
| `/listings` | Toate anunțurile — Auto, Case… | Toate anunțurile |
| `/auto` | Anunțuri Auto în România… | Anunțuri Auto în România |
| `/imobiliare` | Anunțuri Imobiliare în România… | Anunțuri Imobiliare în România |

**Observation:** Homepage `<title>` and H1 differ in branding string — patch tightens title to match H1 message.

**Duplicate titles:** Not detected across main indexable URLs in sample (unique per route).

---

## 6. Structured data (live)

| Page | JSON-LD blocks | Types observed |
|------|------------------|----------------|
| `/` | 6 | Organization, WebSite (+ SearchAction), BreadcrumbList, editorial links |
| `/listings` | 4 | Organization, WebSite (no ItemList on prod pre-patch) |
| `/auto` | 10 | Organization, WebSite, BreadcrumbList, ItemList, FAQPage |
| `/imobiliare` | 10 | same pattern |
| `/listings/{id}` | 8 | Organization, WebSite, **Product**, **Offer**, BreadcrumbList |

**GSC warnings (non-blocking):**

- Missing `aggregateRating` / `review` — no review system → do not fabricate
- Missing global identifier — mitigated with `brand` (make), `sku`, valid `VIN` when stored
- Missing `hasMerchantReturnPolicy` / `shippingDetails` — patch adds truthful classified policies (separate commit)

---

## 7. SSR vs client shell

| Route | Listing links in HTML | Loading text in HTML |
|-------|----------------------|----------------------|
| `/listings` | **24** | Yes (`Se încarcă…` in Suspense fallback — content still present) |
| `/auto` | 10+ (hub previews + links) | No |
| `/imobiliare` | 3+ | No |
| Hub `ListingsView` grid | Client fetch (no `initialListings` seed) | Filters load client-side |

**Gap:** Category hub main grid is weaker for crawlers than `/listings` (ItemList previews exist; full card grid is client-loaded).

---

## 8. Core Web Vitals risks (code review)

| Risk | Notes |
|------|--------|
| LCP | Hero image preloaded on homepage (`HERO_DESKTOP_URL`); listing images via `/api/uploads/serve` with variants |
| CLS | Listing cards use aspect-ratio containers; hero fixed height |
| JS | `ListingsView` is client-heavy; public content still in SSR HTML for `/listings` |
| Images | Large uploads possible; variant pipeline exists (`listing-image-variants`) |

No CWV lab run in this audit — recommend PageSpeed on `/` and a listing detail after deploy.

---

## 9. Internal linking (existing)

| Mechanism | Location |
|-----------|----------|
| Footer category + city pills | `app/components/Footer.tsx` |
| Listing crawl links (SSR) | `ListingRelatedCrawlLinks` on detail layout |
| Hub extras | `SeoMarketHubExtras` — cities, categories, FAQ, latest |
| Homepage editorial strip | `HomeEditorialSeoStrip` |
| HTML sitemap | `/harta-site` |
| Similar listings (UI) | Client-side on detail page |

---

## 10. Roadmap priorities (post-audit)

| Priority | Item | Risk |
|----------|------|------|
| P0 | Alias `/electronice-si-electrocasnice` → `/electronice` | Low |
| P0 | ItemList JSON-LD on `/listings` | Low |
| P1 | Align category sitemap with `seoIndexableListingWhere` | Low |
| P1 | Homepage title brand alignment | Low |
| P1 | Footer links for all pillar categories | Low |
| P2 | Hub `ListingsView` SSR seed (full cards) | Medium |
| P2 | Hub count filter + expiry alignment | Medium |
| P3 | GA4 property + GSC domain property | Ops |
| P3 | Grow indexable inventory (content/marketing) | Business |

---

## 11. GSC post-deploy checklist

1. Add **Domain property** `clickanunt.ro` (if not already).
2. Submit all 5 sitemaps under www property.
3. Validate structured data fixes (Product / Merchant).
4. Inspect **Page indexing** → export sample URLs for `noindex` and `404` (expect many intentional).
5. Request indexing for `/` and `/listings` after deploy.
6. Monitor Performance after 7–14 days (lag normal for new www property).
