# FAZA 17C — CLS + contrast closure

**LOCAL LAB MEASUREMENT — NU FIELD DATA DE PRODUCȚIE.**

HEAD start: `278ac62d` · Port: `3104` · Autovit: BLOCAT DE BOT PROTECTION

## CLS baseline (5 runs, mobile 390×844, cache disabled, reduced motion)

| Rută | Run1–5 | Mediană înainte |
| --- | --- | --- |
| publish | 0.235×4, 0.235 | **0.235** |
| detail | 0.110, 0.822, 0.114, 0.822, 0.110 | **0.114** |

### Publish contributors
| Element | Selector | Start | End | CLS | Cauză |
| --- | --- | --- | --- | --- | --- |
| footer | `footer.mt-auto.max-md:pb-[…]` | y≈477 h≈367 | 0×0 | ~0.231 | Auth-gate skeleton→form + bottom-nav padding race |
| auth shell | `.mx-auto.max-w-3xl` | small y delta | | ~0.004 | Client `PublishListingAuthGate` |

### Detail contributors
| Element | Selector | CLS | Cauză |
| --- | --- | --- | --- |
| similar block / main | `.mt-8.min-h-[18rem]` / `.listing-detail-page` | 0.11 / 0.82 | Client-only listing fetch → full skeleton remount; similar late load |

## Remedieri
1. **Publish:** server `redirect` when no `accessToken`; `data-publish-flow` + CSS `:has()` footer/#main padding (no JS race); removed client gate flash for cookie sessions.
2. **Detail:** SSR `getPublicListingDetailForSsr` + `getSimilarListingsForSsr`; client skips loading skeleton / similar refetch when SSR present.
3. **Contrast:** `--action-solid #c2410c` (white text ≥4.5:1); muted tokens → zinc/neutral-400 without opacity washouts on verification cards; footer legal links brighter.

## CLS after (5 runs)

| Rută | Runs | Mediană după | Țintă ≤0.10 | Stare |
| --- | --- | --- | --- | --- |
| publish | 0,0,0,0,0 | **0.000** | yes | closed |
| detail | 0.0039,0,0,0,0 | **0.000** (final) / 0.0039 (first after) | yes | closed |

## Axe color-contrast
- Înainte: **135** nodes across 8 routes
- După: **0** nodes on same routes

## PR
`gh` unauthenticated — update PR #2 manually with `docs/audits/faza17c/PR-SECTION.md`.
