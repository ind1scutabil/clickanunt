# SEO Visibility — Implementation Report

**Date:** 2026-05-19  
**Status:** Patches applied locally — **NOT deployed**  
**Deploy:** Manual only after review

---

## Root cause (why visibility feels low)

1. **Small indexable inventory (~28 URLs)** — Google cannot send high organic traffic with a tiny catalog.
2. **New GSC www property (May 2026)** — Performance history does not carry over from apex.
3. **Intentional noindex on empty hubs** — `/locuri-de-munca`, `/servicii`, many city hubs show as “excluded” in GSC (correct).
4. **Wrong marketing URL** `/electronice-si-electrocasnice` → 404 (slug is `/electronice`).
5. **GSC structured data warnings** — non-blocking; addressed with truthful classified Offer fields (no fake reviews/shipping).
6. **Analytics confusion** — TikTok views ≠ `listing_view`; May 15 spike was API noise, not organic collapse.

---

## Files changed

| File | Change |
|------|--------|
| `app/page.tsx` | Homepage `<title>` → `ClickAnunț.ro — Anunțuri gratuite în România` |
| `app/listings/page.tsx` | `ItemList` JSON-LD on unfiltered `/listings` SSR page |
| `app/components/Footer.tsx` | Footer category links: +moda, +casa-si-gradina, +sport, +copii, +animale |
| `lib/seo/market-paths.ts` | Alias `electronice-si-electrocasnice` → `electronice` |
| `lib/seo/sitemap-queries.ts` | Category + city sitemap uses `seoIndexableListingWhere()` |
| `app/listings/[id]/ListingJsonLd.tsx` | Classified Offer policy fields (prior GSC patch) |
| `lib/seo/listing-product-jsonld.ts` | **New** — helpers for Product/Offer JSON-LD |
| `tests/unit/listing-product-jsonld.test.ts` | **New** — unit tests |
| `docs/GSC_INDEXING_STRUCTURED_DATA_REPORT.md` | **New** — GSC indexing notes |
| `docs/SEO_VISIBILITY_AUDIT_REPORT.md` | **New** — this audit |

---

## Structured data fields changed (listing detail)

**Offer (added, truthful for classifieds):**

- `availableDeliveryMethod`: `https://schema.org/OnSitePickup`
- `hasMerchantReturnPolicy`: `MerchantReturnNotPermitted` + `merchantReturnLink` → `/terms`

**Product:**

- Removed duplicate `productID` (kept `sku`)
- Added `@id` when building identifiers
- `vehicleIdentificationNumber` only for valid 17-char VIN in DB
- `brand` only when `make` present

**Not added:** `aggregateRating`, `review`, `gtin`, fake `shippingDetails`

**Catalog `/listings`:**

- `ItemList` JSON-LD from first SSR page of listings (unfiltered browse only)

---

## What was NOT changed

- robots.txt policy / disallow lists  
- noindex rules (still noindex when hub count = 0)  
- apex → www 301  
- auth, Stripe, messaging, uploads, photos  
- Prisma schema, production DB  
- admin, dashboard, mobile app  
- repair scripts  
- hub `ListingsView` full-card SSR (roadmap P2)  

---

## Tests

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run type-check` | PASS |
| `npm run test` | PASS (164) |
| `npm run build` | PASS |

---

## Live production evidence (pre-deploy baseline)

Googlebot checks on `https://www.clickanunt.ro` (commit `24db6b9b`):

```
/                     → 200, index, canonical OK, 8 listing links in HTML
/listings             → 200, index, 24 listing links in HTML
/auto                 → 200, index, ItemList+FAQ in JSON-LD
/imobiliare           → 200, index
/listings/{5 samples} → 200, index, Product+BreadcrumbList
/electronice-si-...   → 404 (fixed by alias in this patch)
/locuri-de-munca      → noindex (0 listings)
```

Post-deploy, re-run:

```bash
curl -A "Googlebot" -I https://www.clickanunt.ro/
curl -A "Googlebot" -I https://www.clickanunt.ro/listings
curl -A "Googlebot" -s https://www.clickanunt.ro/listings | grep -c 'ItemList\|/listings/'
curl -A "Googlebot" -I https://www.clickanunt.ro/electronice-si-electrocasnice
curl -A "Googlebot" -s https://www.clickanunt.ro/listings/{id} | grep -E 'OnSitePickup|hasMerchantReturnPolicy'
```

Local (after `npm run dev` restart):

```bash
curl -A "Googlebot" -I http://localhost:3000/
curl -A "Googlebot" -I http://localhost:3000/listings
curl -A "Googlebot" -s http://localhost:3000/listings | head -100
curl -A "Googlebot" -s http://localhost:3000/auto | head -100
```

---

## Remaining risks

| Risk | Mitigation |
|------|------------|
| GSC still shows review/shipping warnings | Document as non-essential; no fake data |
| Listings without `make` lack `brand` | Expected; global identifier warning may persist |
| Hub grids client-only | ItemList previews + crawl links partially compensate |
| Low listing count | Marketing + seller acquisition (not a code-only fix) |
| Category sitemap URL count may drop slightly | Stricter filter = fewer stale URLs (good) |

---

## GSC steps after deploy

1. Deploy during low-traffic window.  
2. GSC → Sitemaps → resubmit all 5 sitemaps.  
3. URL Inspection → test `/listings` and one listing detail → Request indexing.  
4. Validate structured data issue buckets.  
5. Compare Performance www vs old apex after 14 days.  

---

## Rollback

```bash
git checkout -- app/page.tsx app/listings/page.tsx app/components/Footer.tsx \
  lib/seo/market-paths.ts lib/seo/sitemap-queries.ts \
  app/listings/[id]/ListingJsonLd.tsx lib/seo/listing-product-jsonld.ts
# redeploy previous commit
```

---

## Deploy command (when approved)

```bash
# commit first, then:
CONFIRM_PROD_DEPLOY=1 npm run deploy:prod
```

---

**SAFE TO DEPLOY: YES**

All changes are isolated SEO/public metadata/JSON-LD/sitemap-query filters. No auth, payments, uploads, or DB migrations. Lint, type-check, tests, and build pass. Recommend single commit + deploy + GSC validation within 48h.
