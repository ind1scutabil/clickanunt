## UX audit closure

**Commit:** `c42af254` — `fix: complete marketplace responsive and accessibility audit`  
**Parent:** `0872c5c9` (U1–U5 preserved)  
**Port:** `3103` · **3000 untouched** · **Base PR unchanged** (`ea6904b2`)  
**Autovit:** BLOCAT DE BOT PROTECTION / NECONFIRMAT VIZUAL  
**Perf:** LOCAL LAB MEASUREMENT — NU DATE REALE DE PRODUCȚIE

### Matrix / viewports
Public + auth + admin routes captured desktop/mobile; critical surfaces at 1920/1440/1280/1024 + 320/360/390/393/430 + landscape 844×390. Evidence: `docs/audits/faza17b/` + gitignored `test-results/faza17b/`.

### Defects fixed
| ID | Sev | Fix |
| --- | --- | --- |
| SEARCH-NARROW | P1 | Progressive disclosure ≤479px; search ≥97px @320 |
| TT-36 | P2 | Icon targets 44×44 |
| FILTERS-OPEN | P1 | Catalog filters default collapsed |
| CLS-SIMILAR / CLS-PUBLISH | P1 lab | Similar skeletons + hide-nav before paint |
| NESTED-BTN | P1 a11y | Gallery stage no longer `role=button` wrapping controls |
| LINK-BLOCK | P2 | Underlines on in-paragraph legal links |

### Accessibility
axe after: only **color-contrast** remain on 10 routes (muted chrome). Cleared nested-interactive + link-in-text-block. Manual checks executed; **not** claiming full WCAG AA.

### Lighthouse (median of 3, mobile lab)
A11y +3–6 on all routes; publish CLS −15.2% (0.289→0.245); listings LCP −8.3%. Detail CLS still ~0.11 (limitation).

### Links
Same-origin link probe: **0** HTTP failures. GDPR → `/gdpr` (U4).

### E2E
Critical suites Chromium + Mobile Chrome + WebKit: **273×2 passed** consecutive; confirm after rebuild **96 passed**. New: `mobile-navbar-search`, `catalog-filters-collapsed`.

### Limitations
- Remaining axe color-contrast on muted/nav chrome
- Detail CLS lab still elevated
- Autovit visual compare blocked by bot protection
- Full route×viewport screenshot matrix not every cell (critical coverage + each route desktop+mobile)
