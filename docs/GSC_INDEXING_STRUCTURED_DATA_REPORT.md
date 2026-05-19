# Google Search Console — Indexing & Structured Data Report

**Date:** 2026-05-19  
**Site:** https://www.clickanunt.ro/  
**Mode:** Read-only audit + minimal structured-data patch (no deploy in this document)

---

## Phase 1 — Live audit summary (Googlebot UA)

| URL | HTTP | robots meta | x-robots-tag | canonical | JSON-LD |
|-----|------|-------------|--------------|-----------|---------|
| `/` | 200 | `index, follow` | absent | `https://www.clickanunt.ro` | Organization, WebSite |
| `/listings` | 200 | `index, follow` | absent | `https://www.clickanunt.ro/listings` | Organization, WebSite |
| `/imobiliare` (category) | 200 | `index, follow` | absent | `https://www.clickanunt.ro/imobiliare` | Organization, WebSite, ItemList/FAQ* |
| `/listings/{id}` (3 samples) | 200 | `index, follow` | absent | per listing | Organization, WebSite, **Product**, **BreadcrumbList** |

\* Hub pages add ItemList / FAQ when `count > 0`.

**Conclusion:** Homepage, catalog, and listing detail pages are **not** accidentally `noindex`. Apex → www **301** unchanged.

---

## GSC email warnings — blocking vs non-blocking

| GSC warning | Blocking? | Action taken |
|-------------|-----------|--------------|
| Product snippets: missing `aggregateRating` / `review` | **No** (non-essential) | **Document only** — platform has no verified review aggregate; do not fabricate. |
| Product snippets: missing global identifier (gtin / brand) | **No** (non-essential) | **Partial fix:** keep `sku`; add `brand` when `make` exists; add `vehicleIdentificationNumber` when valid VIN in DB. No fake GTIN/MPN. Listings without make may still show this warning. |
| Merchant listings: missing `hasMerchantReturnPolicy` | **No** (non-essential) | **Fix:** `MerchantReturnNotPermitted` + `merchantReturnLink` → `/terms` (P2P classifieds; platform does not process item returns). |
| Merchant listings: missing `shippingDetails` | **No** (non-essential) | **No fake shipping.** Added truthful `availableDeliveryMethod: OnSitePickup` (local / P2P classifieds). Full `OfferShippingDetails` not added — would imply platform shipping. |
| Page indexing: excluded by `noindex` | **Informational** | Many URLs are **intentionally** noindex (see below). |
| Page indexing: 404 | **Per-URL** | Verify examples in GSC UI (auth, edit, old apex paths). Public indexable listings return 200. |

---

## Intentionally `noindex` (by design)

| Pattern | Reason |
|---------|--------|
| `/auth/*`, `/login`, `/register`, `/signup` | Auth flows |
| `/dashboard/*`, `/account/*`, `/messages/*` | Private user areas |
| `/admin/*`, `/test-login`, `/ui-demo`, `/car-catalog-demo` | Internal / demo |
| `/listings/*/edit`, `/listings/*/promote/*`, `/listings/*/messages` | Disallowed in robots + non-public |
| Unknown category/city slug | Invalid hub → noindex |
| Category/city hub with **0** active listings | Thin hub → noindex |
| Listing detail: not indexable (expired, rejected, deleted, non-approved) | `noindex: !isListingSeoIndexable` |

## Intentionally **indexable**

| Pattern | robots | In sitemap |
|---------|--------|------------|
| `/` | index | yes |
| `/listings` | index | yes |
| `/listings/{uuid}` (approved, active, non-expired) | index | yes (28 URLs) |
| Category hubs with listings | index | categories sitemap |
| Static legal/marketing (about, contact, terms, …) | index | main sitemap |

---

## Structured data patch (code)

**Files changed:**

- `lib/seo/listing-product-jsonld.ts` (new helpers)
- `app/listings/[id]/ListingJsonLd.tsx` (Product/Offer JSON-LD)
- `tests/unit/listing-product-jsonld.test.ts` (unit tests)

**Offer additions (truthful for classifieds):**

- `availableDeliveryMethod`: `https://schema.org/OnSitePickup`
- `hasMerchantReturnPolicy`: `MerchantReturnNotPermitted`, `merchantReturnLink` → `/terms`

**Product changes:**

- Removed duplicate `productID` (kept `sku` only)
- Added `@id` canonical product URI
- `brand` / `model` / `vehicleIdentificationNumber` only when data exists

**Not changed:**

- robots.txt, sitemap routes, noindex policy, redirects, canonical policy
- auth, Stripe, messaging, uploads, photos, Prisma schema, production DB
- fake reviews, ratings, GTIN, shipping rates, or delivery windows

---

## Post-deploy validation (run after deploy)

```bash
curl -A "Googlebot" -I https://www.clickanunt.ro/
curl -A "Googlebot" -I https://www.clickanunt.ro/listings
curl -A "Googlebot" -s "https://www.clickanunt.ro/listings/{id}" | grep -o 'application/ld+json">[^<]*' | head -3
```

In GSC → Remediation → validate **Product snippets** / **Merchant listings** after recrawl (days).

---

## Rollback

```bash
git revert <commit-sha>   # revert structured-data commit only
# redeploy previous build
```
