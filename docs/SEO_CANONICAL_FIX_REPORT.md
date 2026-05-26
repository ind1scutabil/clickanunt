# SEO Canonical Fix Report

**Date:** 2026-05-26
**Branch:** `seo-safe-recovery-phase2`

## Root Cause

`app/layout.tsx` (line 27) sets `alternates: { canonical: '/' }` as root metadata.
Pages without their own `alternates.canonical` field inherit this, making their
canonical tag point to the homepage (`https://www.clickanunt.ro`) instead of self.

Google interprets this as: "This page declares itself a duplicate of the homepage."
Result: pages enter "Discovered – currently not indexed" or "Duplicate, Google chose
different canonical than user" in Search Console.

## Files Changed

| File | Change |
|------|--------|
| `app/about/page.tsx` | Added `export const metadata` with `alternates: { canonical: "/about" }` |
| `app/terms/page.tsx` | Added `export const metadata` with `alternates: { canonical: "/terms" }` |
| `app/privacy/page.tsx` | Added `export const metadata` with `alternates: { canonical: "/privacy" }` |
| `app/cookies/page.tsx` | Added `alternates: { canonical: "/cookies" }` to existing metadata |
| `app/gdpr/page.tsx` | Added `alternates: { canonical: "/gdpr" }` to existing metadata |
| `app/anunturi-interzise/page.tsx` | Added `alternates: { canonical: "/anunturi-interzise" }` to existing metadata |
| `app/anti-frauda/page.tsx` | Added `alternates: { canonical: "/anti-frauda" }` to existing metadata |
| `app/rambursari/page.tsx` | Added `alternates: { canonical: "/rambursari" }` to existing metadata |
| `app/notice-takedown/page.tsx` | Added `alternates: { canonical: "/notice-takedown" }` to existing metadata |
| `app/litigii-ue/page.tsx` | Added `alternates: { canonical: "/litigii-ue" }` to existing metadata |
| `app/contact/layout.tsx` | **New** — metadata with `alternates: { canonical: "/contact" }` (client component page) |
| `app/business/layout.tsx` | **New** — metadata with `alternates: { canonical: "/business" }` (client component page) |
| `app/security/layout.tsx` | **New** — metadata with `alternates: { canonical: "/security" }` (client component page) |

## Before / After Canonical Table

| Page | Before (canonical) | After (canonical) |
|------|-------------------|-------------------|
| `/about` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/about` |
| `/contact` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/contact` |
| `/business` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/business` |
| `/terms` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/terms` |
| `/privacy` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/privacy` |
| `/cookies` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/cookies` |
| `/gdpr` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/gdpr` |
| `/anunturi-interzise` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/anunturi-interzise` |
| `/anti-frauda` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/anti-frauda` |
| `/rambursari` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/rambursari` |
| `/notice-takedown` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/notice-takedown` |
| `/litigii-ue` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/litigii-ue` |
| `/security` | `https://www.clickanunt.ro` | `https://www.clickanunt.ro/security` |

## Pages NOT Changed (already correct)

- `/` (homepage) — canonical: `https://www.clickanunt.ro`
- `/listings` — canonical: `https://www.clickanunt.ro/listings`
- `/harta-site` — canonical: `https://www.clickanunt.ro/harta-site`
- `/[categorySlug]` — self-referencing via `createPageMetadata()`
- `/[categorySlug]/[citySlug]` — self-referencing
- `/listings/[id]` — self-referencing
- `/auto/*` hubs — self-referencing

## Checks Passed

- `npm run lint` — PASS
- `npm run type-check` — PASS
- `npm run test` — 174 tests, 36 suites, all PASS
- `npm run build` — PASS

## Rollback

```bash
git revert <commit-sha>
CONFIRM_PROD_DEPLOY=1 npm run deploy:prod
```

## Notes

- Empty category hubs (`/locuri-de-munca`, `/servicii`) intentionally return 200 + `noindex`
  when they have 0 listings. This is safe — prevents indexing of thin pages without
  returning 404 for valid categories that may gain content later.
- `http://www.clickanunt.ro` → HTTPS redirect requires Cloudflare dashboard toggle
  ("Always Use HTTPS") — not a code change.
