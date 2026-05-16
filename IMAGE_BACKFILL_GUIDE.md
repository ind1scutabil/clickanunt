# Image Variant Backfill Guide

Generate **thumb** and **medium** files next to existing **original** uploads on the VPS (local storage layout).

---

## Prerequisites

- Code with `lib/listing-image-pipeline.ts` deployed or run from repo on server  
- `public/uploads/listings/*/original/*` present  
- **S3-only** storage: this script targets **local disk** fallback; S3 backfill needs separate tooling (not in this phase)

---

## Commands

```bash
# Preview
npm run images:backfill -- --dry-run

# First 100 originals
npm run images:backfill -- --limit=100

# Full run (batched, resumable)
npm run images:backfill
```

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `IMAGES_BACKFILL_BATCH` | 8 | Files per batch |
| `IMAGES_BACKFILL_DELAY_MS` | 200 | Pause between batches (ms) |

---

## Resume state

Progress saved in `.images-backfill-state.json` (gitignored). Re-run skips completed keys and existing thumb+medium files.

---

## Safety

- **Never** deletes or modifies `original/`  
- Skips if both `medium` and `thumb` already exist  
- Logs `[ok]` / `[error]` per key  
- Does **not** update database (URLs stay original; UI rewrites paths)

---

## Recommended production procedure

1. `pm2` app online — no restart required for backfill (read/write disk only)  
2. Low-traffic window  
3. `npm run images:backfill -- --dry-run`  
4. `npm run images:backfill -- --limit=50` — verify thumb/medium load in browser  
5. Full backfill  
6. Optional: `du -sh public/uploads/listings` before/after  

---

## Rollback

Delete generated siblings only (keep originals):

```bash
find public/uploads/listings -path '*/medium/*' -delete
find public/uploads/listings -path '*/thumb/*' -delete
rm -f .images-backfill-state.json
```

Site continues to work (fallback to originals).
