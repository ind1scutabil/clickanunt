# Safe Image Pipeline V2 — Audit

**Date:** 2026-05-16  
**Scope:** Listing photos only (non-breaking)

---

## Data model

| Item | Detail |
|------|--------|
| Prisma | `Listing.photos` — `String[]` of URLs (no separate Image table) |
| Stored URL | Usually `/api/uploads/serve?key=listings/{listingId}/original/{file}.jpg` |
| Legacy | Flat paths under `/uploads/` without size segment |

---

## Upload paths

| Endpoint | Behaviour |
|----------|-----------|
| **`POST /api/uploads`** | Primary create flow (`CreateListingForm`, `OptimizedListingFlow`). **Before V2:** original only. **After V2:** original + thumb + medium written alongside. |
| **`POST /api/images`** | Multipart; already generates thumb/medium/large/original via `processImageMultipleSizes` (800×600 thumb preset — different from V2 120/900). Not changed in this phase. |

---

## Storage layout (local fallback)

```
public/uploads/
  listings/
    {listingId}/
      original/   ← source of truth (untouched)
      medium/     ← NEW (V2, ~900px max edge)
      thumb/      ← NEW (V2, ~120px max edge)
```

S3/R2: same key structure via `generateImageKey()` + `uploadImage()`.

---

## Serving

| Route | Behaviour |
|-------|-----------|
| **`GET /api/uploads/serve?key=`** | Streams file from `public/uploads/{key}`. `Cache-Control: public, max-age=31536000, immutable`. |
| **Next.js `/uploads/*`** | Static from `public/uploads` when applicable |

---

## Processing libraries

| Module | Role |
|--------|------|
| `sharp` | `lib/imageProcessing.ts` (legacy sizes), **`lib/listing-image-pipeline.ts`** (V2: 120 / 900) |
| `stripExifData` | Rotate + strip on upload (`uploads` route) |

---

## Display (before V2)

| Surface | Source |
|---------|--------|
| Listing detail hero | Full **original** `<img>` |
| Thumbnails | Same **original** URL |
| Listing cards | `listingPrimaryPhotoSrc` → original |
| `next/image` | Config present; **not used** on listing detail/cards |

---

## Production evidence (pre-backfill)

Sample listing: 4× **original** only; `thumb`/`large` paths return **404** until backfill or new upload.

---

## V2 design constraints met

- Originals never deleted or overwritten  
- DB URLs unchanged (still point at original)  
- Variant URLs derived by path rewrite (`original` → `thumb` / `medium`)  
- Client fallback chain on 404: thumb → medium → original  

---

*See `SAFE_IMAGE_PIPELINE_IMPLEMENTATION.md` and `IMAGE_BACKFILL_GUIDE.md`.*
