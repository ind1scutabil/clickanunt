# Growth SEO + Analytics — deployment report

**Date:** 2026-05-10  
**Branch:** `messaging-stable`  
**Commit deployed:** `ca8c4469` (`feat(seo): growth layer — GA4, Clarity, dynamic OG, schema, FAQ hubs`)

## Build validation (local + VPS)

| Step | Result |
|------|--------|
| `npm ci` | Success |
| `npm run db:migrate` | No pending migrations (local + VPS) |
| `NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run type-check` | Pass |
| `npm run lint` | Pass |
| `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run build` | Pass (known OpenTelemetry warning from Sentry/messaging trace) |
| VPS `npm run build` | Pass |
| PM2 | `pm2 reload clickanunt --update-env` + `pm2 save` — process **clickanunt** online |

## Production environment (VPS)

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | **Present** (`.env` on `/var/www/clickanunt`) |
| `NEXT_PUBLIC_GA_ID` | **Missing** — GA4 scripts **not** injected until set and app rebuilt |
| `NEXT_PUBLIC_CLARITY_ID` | **Missing** — Clarity **not** loaded until set and app rebuilt |

## URLs verified (HTTP 200, `https://www.clickanunt.ro`)

**Core / SEO**

- `/`
- `/robots.txt`
- `/sitemap.xml`
- `/sitemap-categories.xml`
- `/sitemap-cities.xml`
- `/sitemap-listings.xml`

**Growth SEO**

- `/opengraph-image`
- `/auto/opengraph-image`
- `/auto/bucuresti/opengraph-image`
- `/auto`
- `/electronice/timisoara`

**Listing sample (live API-first id)**

- `/listings/6bdd34b6-56ae-4e20-af98-3efc57c6cdaf`
- `/listings/6bdd34b6-56ae-4e20-af98-3efc57c6cdaf/opengraph-image`

**Smoke (HTTP 200)**

- `/listings`, `/auth/login`, `/auth/register`, `/messages`, `/admin/dashboard`, `/listings/new`, `/listings/<id>/promote`

## Sitemap status

- Responses **200**; sample `sitemap.xml` / `sitemap-categories.xml` parse as **valid XML**
- `<loc>` values use **`https://www.clickanunt.ro`** (no localhost / staging in samples)

## Robots status

- **200**; tail includes `Host: www.clickanunt.ro` and **four** HTTPS sitemap lines
- **No** `localhost` in live `robots.txt` (Cloudflare / edge aligned with origin at verification time)

## Open Graph images

- All tested OG routes return **200** (PNG/image responses)

## Analytics status

- **GA4:** inactive — add `NEXT_PUBLIC_GA_ID=G-…` to VPS `.env`, then `npm run build` + `pm2 reload clickanunt --update-env`
- **Clarity:** inactive — add `NEXT_PUBLIC_CLARITY_ID=…`, then rebuild + reload

## Structured data (live HTML checks)

- **Homepage:** `Organization` + `WebSite` (global JSON-LD)
- **Category hub (`/auto`):** `BreadcrumbList` + `ItemList` + `FAQPage`
- **Listing (`6bdd34b6-…`):** `Product` + `Offer` + `BreadcrumbList` + global graphs (**4** `application/ld+json` blocks total — expected: global + listing)
- No duplicate `Product` blocks observed; invalid listings should not emit listing JSON-LD (server `isListingSeoIndexable`)

## Remaining blockers / manual actions

1. **Optional tracking:** set `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_CLARITY_ID` and redeploy for measurement.
2. **Consent (GDPR):** if enabling GA/Clarity, wire CMP / `gtag('consent', …)` per legal review.
3. **Price in Offer JSON-LD:** spot-check listing prices vs DB units if Rich Results show mismatches (separate from this deploy).

## Verdict

**SAFE** — Growth SEO deploy is live; core SEO URLs, OG routes, sitemaps, robots, hubs, and sample listing behave correctly. Analytics remain **off** until env IDs are added.
