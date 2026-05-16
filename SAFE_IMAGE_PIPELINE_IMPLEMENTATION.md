# Safe Image Pipeline V2 — Implementation

**Date:** 2026-05-16  
**Deployed:** NO (local changes only)

---

## New modules

| File | Purpose |
|------|---------|
| `lib/listing-image-pipeline.ts` | Sharp: thumb 120px, medium 900px; `uploadListingImageWithVariants()` |
| `lib/listing-image-variants.ts` | `getListingImageUrl()`, `applyListingImageFallback()`, URL rewrite |
| `scripts/images-backfill-variants.ts` | Optional batch backfill |
| `tests/unit/listing-image-variants.test.ts` | URL rewrite tests |

---

## Modified files

| File | Change |
|------|--------|
| `app/api/uploads/route.ts` | After validation, upload original + generate thumb/medium siblings |
| `app/listings/[id]/ListingDetailPageClient.tsx` | Hero **medium**, thumbs **thumb**, modal **original** + fallback chain |
| `app/components/ListingCard.tsx` | Card image **medium** + fallback |
| `package.json` | `npm run images:backfill` |
| `.gitignore` | `.images-backfill-state.json` |

---

## Variant spec

| Variant | Max edge | Format | Quality |
|---------|----------|--------|---------|
| thumb | 120px | JPEG | 82 |
| medium | 900px | JPEG | 85 |
| original | unchanged | as uploaded | — |

- EXIF orientation: `sharp().rotate()` before resize  
- WebP: **not** enabled (JPEG only for compatibility)  
- `withoutEnlargement: true` (no upscale)

---

## API contract (unchanged)

Upload response still returns **original** `url` and `key` — forms/DB behaviour unchanged.

---

## Display mapping

| UI | Variant | Fallback |
|----|---------|----------|
| Gallery thumbs | thumb | → medium → original |
| Listing cards | medium | → original |
| Detail hero | medium | → original |
| Modal / zoom | original | placeholder SVG |

---

## What was NOT changed

- Prisma schema / migrations  
- Existing `photos[]` values in DB  
- `/api/images` size presets  
- S3/CDN configuration  
- UI layout/CSS  
- Auth, payments, messages, admin  
- Production deploy  

---

## Verification

```bash
npm run lint
npm run type-check
npm run test -- --forceExit
npm run build
```

---

## Rollback

```bash
git checkout HEAD -- lib/listing-image-pipeline.ts lib/listing-image-variants.ts \
  app/api/uploads/route.ts app/listings/[id]/ListingDetailPageClient.tsx \
  app/components/ListingCard.tsx scripts/images-backfill-variants.ts
```

Generated files on disk (`thumb/`, `medium/`) can remain; originals still work.

---

## Safe for production?

**Yes**, after:

1. Deploy code  
2. Run `npm run images:backfill -- --dry-run` then backfill on VPS (low traffic window)  
3. Smoke one old + one new listing  

Until backfill, old listings use fallback to original (no broken images).

---

*Nu s-a făcut deploy.*
