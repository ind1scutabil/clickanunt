# Next growth SEO — mass indexing & programmatic expansion

## SAFE / scope

**SAFE for production** (pending your deploy): `npm run type-check`, `npm run lint`, and `NODE_ENV=production npm run build` succeed.

No changes to Stripe, messaging, auth, admin, payment routes, or sitemap **chunk** architecture (`sitemap-serve/*`, `robots.ts` contract). Core sitemap index files unchanged; **`app/sitemap.ts`** adds one static URL: `/harta-site`.

---

## Files added

| File | Purpose |
|------|---------|
| `lib/seo/programmatic-hub-copy.ts` | Dynamic, data-backed intro paragraphs (counts, avg/min/max price, tips). |
| `lib/seo/popular-internal-links.ts` | Crawlable “popular” links + cross-category same-city hubs. |
| `app/components/seo/ListingRelatedCrawlLinks.tsx` | Server HTML block: related listings (category + city + ~±25% price), fallback widens. |
| `app/components/seo/HomeEditorialSeoStrip.tsx` | Homepage “fresh” grid + hub pills + link to HTML sitemap. |
| `app/harta-site/page.tsx` | HTML sitemap page (categories × highlight cities). |
| `NEXT_GROWTH_SEO_REPORT.md` | This report. |

## Files modified

| File | Change |
|------|--------|
| `lib/seo/hub-queries.ts` | Exported `hubWhereBase`; **`moderationStatus: approved`** for hub/stats alignment with public quality; `getHubListingStats()` aggregates. |
| `app/components/seo/SeoMarketHubExtras.tsx` | Popular searches, latest listings, same-city other categories, trust panel with `/security`, `/contact`, `/terms`, `/about`. |
| `app/[categorySlug]/page.tsx` | Programmatic copy; internal links; **pagination-aware canonical** (`?page=n`). |
| `app/[categorySlug]/[citySlug]/page.tsx` | Same + **cross-category links** for the same city slug. |
| `app/listings/[id]/layout.tsx` | `ListingRelatedCrawlLinks` after page content. |
| `app/page.tsx` + `HomePageClient.tsx` | Editorial / Discover-oriented strip above footer. |
| `app/sitemap.ts` | `/harta-site` entry. |
| `lib/seo/market-paths.ts` | Reserved slug `harta-site`. |
| `app/components/ListingsView.tsx` | `decoding="async"`, `sizes` on listing card images. |

---

## URLs / routes

- **New:** `https://www.clickanunt.ro/harta-site` (HTML sitemap; linked from homepage strip).
- **Enhanced:** All existing `/{category}` and `/{category}/{city}` hubs — extra crawlable blocks + programmatic text.
- **Listing detail:** Server-rendered related links at bottom (in addition to client “similar” grid).

---

## SEO features delivered (by phase)

1. **Internal linking:** Hub pills (cities, categories, popular `/listings?…`, latest listing URLs, cross-category same city); listing price-band related links — all real `<a>` / `<Link>`.
2. **Indexable landings:** Already existed; **enriched** with unique programmatic paragraphs, trust block, canonicals for `?page=`.
3. **Programmatic content:** Counts + aggregate prices + buyer/seller tips (`programmatic-hub-copy.ts`).
4. **Indexing:** Stronger mesh (HTML sitemap + hubs + listings); `noindex` unchanged for empty hubs; rel/canonical for pagination via metadata.
5. **Performance:** Lazy listing cards + `sizes` + `decoding="async"` (ListingsView); editorial strip uses native `img` with lazy (no handler — RSC-safe inside client prop).
6. **Trust:** Hub trust panel + existing security messaging paths.
7. **Discover-oriented:** Larger visual cards + stronger titles on homepage strip + price line.
8. **Crawl helpers:** `/harta-site`, related listings, cross-category city depth.

---

## Indexing & Discover — assessment

| Area | Readiness |
|------|-----------|
| **Mass indexing** | **Improved** — more HTML links, HTML sitemap, price-related listing mesh, pagination canonicals. |
| **Discover** | **Moderate** — homepage editorial strip helps freshness signals; further gains need consistent high-quality images + velocity. |

## Bottlenecks / next ROI

1. **Align sitemap `groupBy` filters** with `hubWhereBase` (optional): today chunk sitemaps use `status: active` + `deletedAt: null` only; hubs use **approved** too — rare mismatch if pending slip through.
2. **rel=prev/next** for paginated hubs — not added (client pagination); canonical per page is set.
3. **Core Web Vitals:** Further gains need `next/image` where remote patterns allow, font subsetting, and bundle review — out of minimal scope here.

## Estimated impact

- **Short term:** Better crawl paths, richer snippets context, lower orphan risk for new hubs.
- **Medium term:** More long-tail coverage as inventory grows; depends on moderation quality and listing velocity.

---

## Verification checklist (post-deploy)

- [ ] `GET /harta-site` → 200, links resolve.
- [ ] Hub with `?page=2` → canonical contains `page=2`.
- [ ] View-source on `/auto` → new JSON-LD unchanged count (FAQ + ItemList + Breadcrumb).
- [ ] Listing page → related block at bottom with distinct URLs.
- [ ] `sitemap.xml` includes `/harta-site`.
