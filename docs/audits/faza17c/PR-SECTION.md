## FAZA 17C — CLS + accessible contrast

**Commit:** _(pending)_ · **Parent:** `278ac62d`  
**Port:** `3104` · **3000 untouched** · **Base PR unchanged**  
**LOCAL LAB MEASUREMENT — NU FIELD DATA DE PRODUCȚIE**  
**Autovit:** BLOCAT DE BOT PROTECTION / NECONFIRMAT VIZUAL  
**PR note:** `gh` not authenticated — paste this section manually into PR #2.

### CLS (5 runs, Chromium, 390×844)

| Rută | Mediană înainte | Mediană după | Țintă | Stare |
| --- | --- | --- | --- | --- |
| `/listings/new` | 0.235 | **0.000** | ≤0.10 | closed |
| `/listings/[id]` | 0.114 | **0.000** | ≤0.10 | closed |

**Publish cause:** footer `mt-auto` + auth-gate skeleton + bottom-nav padding race.  
**Fix:** server redirect for unauthenticated publish; `data-publish-flow` + CSS `:has()` padding.

**Detail cause:** client-only fetch → full-page skeleton remount + late similar listings.  
**Fix:** SSR listing + similar via `getPublicListingDetailForSsr` / `getSimilarListingsForSsr`.

### Axe color-contrast (8 routes)

| | Nodes |
| --- | --- |
| Înainte | 135 |
| După | **0** |

Solid CTAs: white on `#c2410c` (≥4.5:1). Muted prose: zinc/neutral-400 without opacity washouts.

### Evidence
`docs/audits/faza17c/` — REPORT, cls-before/after, axe-contrast-before/after, lighthouse-after.
