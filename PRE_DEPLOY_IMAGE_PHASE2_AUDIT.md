# Pre-Deploy Audit — Image Performance Phase 2

**Date:** 2026-05-16  
**Branch:** `current-infra-stability-safe`  
**Rollback commit (production + local HEAD before deploy):** `fad54421`  
**Deploy commit:** `da6f05f0`

---

## Git state (pre-commit)

| Item | Value |
|------|--------|
| Branch | `current-infra-stability-safe` |
| HEAD | `fad54421` — Fix images:backfill ts-node path alias resolution |
| VPS HEAD | `fad54421` |

### Files in Phase 2 deploy (13 paths)

| File | Purpose |
|------|---------|
| `lib/listing-image-variants.ts` | RN fallback helper |
| `app/api/uploads/serve/route.ts` | Cache headers + nosniff |
| `app/components/ListingCard.tsx` | `imagePriority` |
| `app/components/ListingsView.tsx` | First 4 cards priority |
| `app/components/HomeDiscoverShelf.tsx` | First 2 cards priority |
| `app/components/seo/HomeEditorialSeoStrip.tsx` | Medium variant |
| `apps/mobile/src/utils/listingPhotos.ts` | Medium/thumb URIs |
| `apps/mobile/src/components/ListingPhotoImage.tsx` | **New** — RN fallback |
| `apps/mobile/src/screens/HomeScreen.tsx` | ListingPhotoImage + FlatList |
| `apps/mobile/src/screens/FavoritesScreen.tsx` | ListingPhotoImage |
| `apps/mobile/src/screens/ListingDetailsScreen.tsx` | Medium carousel |
| `tests/unit/listing-image-variants.test.ts` | Tests |
| `tests/unit/mobile-listing-photos.test.ts` | **New** — Tests |

**Excluded from deploy commit:** `LIVE_IMAGE_PIPELINE_FINAL_VALIDATION.md` (prior validation doc only).

---

## Local checks

| Command | Result |
|---------|--------|
| `npm run lint` | **PASS** |
| `npm run type-check` | **PASS** |
| `npm run test` (Jest 72 tests, `--forceExit`) | **PASS** |
| `npm run build` | **PASS** |

---

## Production read-only (pre-deploy, `fad54421`)

| Check | Result |
|-------|--------|
| PM2 | **online**, unstable restarts **0** |
| `/api/health` | **200**, `database.up: true` |
| Homepage | **200** |
| Listing `8a40873e-…` detail | **200** |
| Image original | **200**, 207 KB |
| Image medium | **200**, 55 KB |
| Image thumb | **200**, 1 KB |
| Cache-Control (200, pre-deploy) | `private, no-store` (edge; code change sets immutable after deploy) |

---

## Rollback command

```bash
ssh root@46.225.69.155 'cd /var/www/clickanunt && ./scripts/rollback.sh fad54421'
```

---

## Deploy gate

**PASS** — Proceed with `CONFIRM_PROD_DEPLOY=1 npm run deploy:prod` after commit.
