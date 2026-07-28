# FAZA 17B — UX audit closure evidence

**LOCAL LAB MEASUREMENT — NU DATE REALE DE PRODUCȚIE.**

Autovit: **BLOCAT DE BOT PROTECTION / NECONFIRMAT VIZUAL** (reuse FAZA 17).

## Baseline

| Field | Value |
| --- | --- |
| Branch | `feat/category-price-and-salary-model` |
| Parent HEAD (FAZA 17) | `0872c5c9` |
| Port | `3103` (3000 untouched) |
| PR | https://github.com/ind1scutabil/clickanunt/pull/2 |
| Base | `checkpoint/pre-category-price-salary` @ `ea6904b2` |

U1–U5 (favorites cookie-first, safe return paths, login redirect, footer GDPR, 404) preserved.

## Defects closed in 17B

| ID | Sev | Route | Viewport | Observation | Fix |
| --- | --- | --- | --- | --- | --- |
| SEARCH-NARROW | P1 | `/` | 320–360 | Search input ~26–53px unusable | Progressive disclosure ≤479px: Favorite/Mesaje/notifications → hamburger; search ≥97px @320 |
| TT-36 | P2 | `/` mobile | all | Icon buttons 36×36 | `.navbar-mobile-icon-btn` → 44×44 |
| FILTERS-OPEN | P1 | `/listings` | mobile | Filters default-open buried results | `isFiltersOpen` default `false`; results-first |
| APPLY-H40 | P2 | `/listings` | mobile | Apply/reset h-10 | min-h 44px |
| CLS-SIMILAR | P1 lab | detail | mobile LH | Similar listings empty→grid CLS ~0.11 | Skeleton grid + `similarLoading` true |
| CLS-PUBLISH | P1 lab | publish→login | mobile LH | Footer padding flip CLS ~0.29 | SSR `data-hide-mobile-bottom-nav` on new/edit layouts; login Suspense min-h |
| NESTED-BTN | P1 a11y | detail gallery | — | `role=button` stage nesting controls | Stage is non-interactive container; dedicated buttons remain |
| LINK-BLOCK | P2 a11y | footer/home | — | Links in text not underlined | Permanent underline on in-paragraph legal links |

## Captures

Gitignored: `test-results/faza17b/` (before matrix, `after/`, `auth/`).

Notable after:

- `after/home-m320.png` — usable header search + 2 trailing icons
- `after/listings-m390.png` — filters collapsed, cards visible
- `auth/user-_listings_new-m390.png` — publish wizard, no public bottom nav
- `auth/admin-_admin_moderation-m390.png` — KPI cards stacked, admin bottom tab
- `auth/user-_dashboard_listings-m390.png` — listings lifecycle filters

## Accessibility

Automated axe (WCAG2 A/AA tags) after remediations: see `docs/audits/faza17b/axe-results.json`.

Factual claim: nested-interactive on gallery **fixed**; remaining findings are mostly **color-contrast** on muted chrome (`zinc-500` / footer copy) — not claimed as full WCAG AA.

Manual checks executed: landmarks, skip link presence in layout, focus-visible on icon buttons, Escape on cookie settings, gallery lightbox trap (unit), publish Continues visible, admin destructive confirms (existing E2E).

## Performance

See `lighthouse-before.json` / `lighthouse-after.json`. Form factor: mobile 390×844 simulated throttling.

## Links

Probe on public pages: **0 HTTP failures** among sampled same-origin hrefs (`matrix.json`). GDPR → `/gdpr` (U4 preserved).

## E2E

New: `mobile-navbar-search.spec.ts`, `catalog-filters-collapsed.spec.ts`.

Critical suites ×2 on build under test (Chromium / Mobile Chrome / WebKit) — results recorded in gate log.

## Lighthouse medians (mobile lab)

LOCAL LAB MEASUREMENT — NU DATE REALE DE PRODUCȚIE.
Form factor: 390×844 simulated throttling. Median of 3 runs.

| Rută | Perf înainte→după | A11y înainte→după | CLS înainte→după | LCP ms înainte→după |
| --- | --- | --- | --- | --- |
| home | 84→84 | 93→97 | 0.004→0.004 | 4553→4571 |
| listings | 90→92 | 89→95 | 0.004→0.004 | 3618→3317 |
| detail | 56→57 | 94→97 | 0.114→0.111 | 4082→4071 |
| publish | 80→83 | 93→96 | 0.289→0.245 | 3020→2936 |
| dashboard-listings | 95→92 | 93→96 | 0.004→0.004 | 3012→3315 |
| messages | 94→94 | 93→96 | 0→0 | 3016→3014 |
| admin-moderation | 85→84 | 93→97 | 0.013→0 | 4438→4509 |

Accessibility LH scores rose on all audited routes (+3–6 pts). Publish CLS −15.2%. Detail CLS still elevated (~0.11) — similar-listings min-height reserved in final build after LH-after capture.

## axe (after)

Only remaining automated violations on the 10 routes: **color-contrast** (muted chrome / orange-on-dark edge cases). Cleared: nested-interactive (gallery), link-in-text-block (footer/home).

## E2E

Critical matrix Chromium + Mobile Chrome + WebKit: **273 passed × 2** consecutive on production build `:3103`. Confirm subset after final rebuild: **96 passed**. Auth/favorites not re-flaked (U1–U5 intact).

BUILD_ID final: see `.next/BUILD_ID` at gate time.
