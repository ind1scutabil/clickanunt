# FAZA 18 — Final integration audit report

**Date:** 2026-07-28  
**Branch:** `feat/category-price-and-salary-model`  
**Base:** `ea6904b2` (`checkpoint/pre-category-price-salary`)  
**FAZA 17C SHA:** `79584c5f` — `fix: stabilize marketplace layouts and accessible contrast` (parent `278ac62d`)  
**Lab port:** `3105` (3000 untouched)

## A. Verdict

**READY FOR STAGING REVIEW**

Not ready for production. Staging host/DB/secrets remain **LIPSĂ** (see `docs/STAGING_ENVIRONMENT.md`).

## B. HEAD / 17C

| Item | Value |
|------|-------|
| Local HEAD (pre-commit) | `79584c5f…` |
| Remote (pre-commit) | `79584c5f…` (0 ahead / 0 behind) |
| FAZA 17C | `79584c5f` |
| Merge-base | `ea6904b2` |
| Commits in PR | 25 (+ this chore) |

## C–E. PR inventory

- Diff `ea6904b2..79584c5f`: **315 files**, +39688 / −4650  
- Layers: tests 65, API 52, listings/seo 42, docs 23, web 20, auth 17, CI/scripts 15, payments 13, admin 12, mobile/shared 12, schema 8, …  
- No accidental `.env` / secrets committed  
- Orphan / ghost: classified only (no mass delete)

## F–G. Migrations + isolated DB

| Migrare | Scop | Expand | Test |
|---------|------|--------|------|
| `20260726230000_listing_price_type_and_salary` | priceType + salary | yes | SQL unit + isolated deploy |
| `20260727140000_invoice_payment_unique` | invoice paymentId unique | yes | isolated deploy |
| `20260727210000_user_session_version` | users.sessionVersion | yes | isolated deploy |
| `20260727220000_auth_refresh_token_rotation` | auth_refresh_tokens | yes | isolated deploy |
| `20260727230000_auth_email_verification_tokens` | hash-only email tokens | yes | isolated deploy |

**A. Empty DB `migrate deploy`:** FAIL at historical `20260327180000_enterprise_feed_boost_and_indexes` — `messages` relation missing from earlier migrations (not introduced by this PR). Documented; do not empty-migrate staging from zero without messaging tables.

**B. Pre-feature → PR:** PASS on Docker Postgres `:5433` / `autoplat_faza18_pre` via real `prisma migrate deploy` (5 migrations). Integrity: fixtures retained; Job `priceType`/`salaryMin` NULL; non-Job FIXED backfill; `sessionVersion=0`; invoice payment unique; token tables present. Container removed after test.

**Rollback floor:** ≥ `ed22afed` / `3c924c72`. Never `ea6904b2` after expand.

## H. Protections (prior phases)

All 15 checklist items **OK** (no regression). See explore audit in session.

## I. Secrets

Placeholders / test fixtures only. No live keys in diff.

## J. Dependencies

`npm audit --omit=dev`: 32 issues (23 moderate, 9 high), largely transitive `undici` / `uuid` via `bull`. No major upgrade applied. Not confirmed as exploitable P0 on this surface.

## K. Web/mobile

Parity OK on audited domains. Mobile does not import Next/server. Legacy clients get controlled 400 (not 500) for invalid price/salary.

## L. SEO/JSON-LD

robots / noindex / FREE·ON_REQUEST Offer omission / no phone in JSON-LD — OK per unit tests + code review.

## M. CI

Added `.github/workflows/pr-ci.yml`: lint, type-check, unit, prisma validate/generate, integrity subset, build. No deploy secrets, no `pull_request_target`, concurrency cancel-in-progress, `workflow_dispatch` + feature-branch push (special base may skip `pull_request` alone).

## N. Build/runtime

| Item | Value |
|------|-------|
| BUILD_ID | `a99TfVWv3B_wPHo085_e5` |
| Port | 3105 |
| Health | 200 |
| `/api/listings` | 200 |
| Homepage | 200 |
| 404 | 404 |
| Server stopped | 3105 free |

## O–P. Tests

| Gate | Result |
|------|--------|
| lint / type-check | PASS |
| unit `tests/unit` | 738 passed |
| prisma validate/generate | PASS |
| Critical product/security E2E ×2 (Chromium + Mobile Chrome + WebKit) | Run1 **197/198** (1 classified flake); Run2 **198/198** |
| Broader UI smoke suite | Residual parallel flakes (cookie/search/hero) — **not** in CI; classified P2 harness |

**Flake class P2-E2E-1:** `public-listing-privacy` Mobile Chrome once under parallel load; re-run alone PASS; full suite run2 PASS.

## Q–S. Remedieri this phase

1. **P1** Upload API rejected video persistence (`VIDEO_NOT_SUPPORTED` + schema `type: image` only).  
2. PR CI workflow.  
3. Staging runbook order + empty-migrate caveat.  
4. E2E harness: prefer `PLAYWRIGHT_BASE_URL`, cookie consent helper, smoke baseURL.

## T. Staging runbook

Updated in `docs/STAGING_ENVIRONMENT.md` / `docs/STAGING_CHECKLIST.md`. No deploy executed.

## U. Remaining

- Staging infra LIPSĂ  
- Empty-DB historical migrate gap  
- Transitive npm audit highs (undici) — no safe major patch in scope  
- Broader UI E2E under heavy parallel — P2 harness  

## X. Rollback

App rollback only to Prisma-compatible SHA after price/salary expand.

## Y. Ports

3000 free throughout; lab **3105**.

## Z. Confirmations

No merge / auto-merge / deploy / staging migrate / Stripe LIVE / force push / base change.
