# SAFE SEO Recovery Plan — Phase 2

**Branch:** `seo-safe-recovery-phase2`  
**Date:** 2026-05-19  
**Mode:** Enterprise safe — no payments/auth/messaging changes

## Snapshots (pre-change references)

| Area | Files |
|------|--------|
| Metadata | `lib/seo.ts`, `app/page.tsx`, `app/listings/[id]/layout.tsx` |
| Edge proxy | `proxy.ts` |
| Robots / sitemap | `app/robots.ts`, `app/sitemap.ts`, `app/sitemap-serve/**` |
| Listings UI | `app/listings/page.tsx`, `app/components/ListingsView.tsx` |
| Analytics | `lib/analytics-events.ts`, `lib/analytics-context.ts`, `app/api/listings/[id]/route.ts` |

## Phases & files touched

### Phase 1 — Apex → www 301
- `lib/seo/apex-canonical-host.ts` (new)
- `proxy.ts`
- `tests/unit/apex-canonical-host.test.ts` (new)

**Purpose:** Permanent 301 from `clickanunt.ro` → `https://www.clickanunt.ro` (path + query preserved).  
**Risk:** Low — skips localhost; API paths redirect same host (canonical www).  
**Rollback:** Revert `proxy.ts` + delete helper.

### Phase 2 — Homepage brand SEO
- `app/page.tsx` (metadata only)
- `app/components/home/HomePremiumHero.tsx` (H1 text only)

**Purpose:** Brand-aligned title/description/H1 for “clickanunt” queries.  
**Risk:** Low — copy only, no layout change.  
**Rollback:** Revert two files.

### Phase 3 — /listings SSR first page
- `lib/listings/public-browse-server.ts` (new)
- `app/listings/page.tsx` (async server fetch + seed props)
- `app/components/ListingsView.tsx` (optional initial data)

**Purpose:** Crawlers see real listing titles/links in HTML (no empty “Se încarcă…” shell).  
**Risk:** Medium — hydration must match seed; mitigated by skip-first-fetch when seed present.  
**Rollback:** Revert three files; catalog returns to client-only load.

### Phase 4 — Sitemap indexable alignment
- `lib/seo/indexable-listing-where.ts` (new)
- `app/sitemap-serve/listings-index/route.ts`
- `app/sitemap-serve/listings/[chunk]/route.ts`
- `tests/unit/seo-indexable-listing-where.test.ts` (new)

**Purpose:** Sitemap lists only SEO-indexable listings (approved, active, not expired).  
**Risk:** Low — may reduce sitemap count if non-approved rows were included before.  
**Rollback:** Revert to `status: active` only filter.

### Phase 5 — Analytics session + context
- `lib/analytics-context.ts`
- `lib/analytics-events.ts`
- `app/listings/[id]/ListingDetailPageClient.tsx`
- `app/components/ListingsView.tsx` (session header on browse fetch)

**Purpose:** Pass `x-analytics-session-id`; store referrer/UA in event metadata.  
**Risk:** Low — no schema change; listing `views` increment unchanged.  
**Rollback:** Revert four files.

## Out of scope (unchanged)
- Prisma schema / migrations
- Stripe / Netopia / auth routes
- Moderation approve/reject logic
- Admin / messaging UI

## Validation checklist
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `curl -I https://clickanunt.ro` → 301 www (after deploy)
- [ ] View source `/listings` contains listing titles
- [ ] Sitemap listing count vs indexable DB count

## Deploy policy
**Do not deploy** until user approves after reviewing `FINAL_SEO_RECOVERY_REPORT.md`.
