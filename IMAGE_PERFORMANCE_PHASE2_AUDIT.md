# Image Performance Phase 2 — Audit

**Date:** 2026-05-16  
**Scope:** Web cards/detail, mobile app, `/api/uploads/serve`, feed lazy-loading.  
**Production state:** 79/79 originals with medium + thumb on disk (backfill complete).

---

## 1. Web — listing cards & detail

| Location | Current behavior | Risk |
|----------|------------------|------|
| `app/components/ListingCard.tsx` | `listingPrimaryPhotoSrcForVariant(..., 'medium')`, `loading="lazy"`, `onError` → `applyListingImageFallback` | Low — correct variant |
| `app/listings/[id]/ListingDetailPageClient.tsx` | Hero **medium** (eager + preload), thumbs **thumb** (IO + lazy), modal **original** | Low |
| `app/components/seo/HomeEditorialSeoStrip.tsx` | **`listingPrimaryPhotoSrc`** (original) in SSR `<img>` | **Medium** — editorial strip downloads originals |
| `app/components/ListingsView.tsx` | Maps all listings to `ListingCard`; all images `lazy` | **Low–medium** — first row LCP not prioritized |
| `app/components/HomeDiscoverShelf.tsx` | `ListingCard`, all lazy | Low |

**Proposed (minimal):**

- Editorial strip: `medium` variant + first tile eager.
- `ListingCard`: optional `imagePriority` for first N grid items.
- `ListingsView`: `imagePriority={index < 4}`.

---

## 2. Mobile app

| Location | Current behavior | Risk |
|----------|------------------|------|
| `apps/mobile/src/utils/listingPhotos.ts` | `listingPrimaryPhotoSrc` → **original** URLs | **High** — cards/detail download full originals |
| `HomeScreen.tsx` | `FlatList` + `Image` + `primaryListingPhotoUri` | High bandwidth; FlatList default render window OK |
| `FavoritesScreen.tsx` | Same | High |
| `ListingDetailsScreen.tsx` | `listingPhotoGalleryUris` → all **originals** in carousel | High |

**Proposed (minimal):**

- Extend `listingPhotos.ts` to use `getListingImageUrl` / `listingPrimaryPhotoSrcForVariant` (shared `lib/listing-image-variants.ts`).
- Cards/favorites/home: **medium**.
- Detail carousel: **medium** (hero-sized); reserve **original** helper for future fullscreen.
- Small `ListingPhotoImage` with RN `onError` fallback chain (thumb → medium → original).
- `FlatList`: `initialNumToRender` / `windowSize` tuning only (no new virtualizer lib).

---

## 3. Image serve route — cache headers

| File | Current behavior |
|------|------------------|
| `app/api/uploads/serve/route.ts` | **200:** `Cache-Control: public, max-age=31536000, immutable` |
| | **404:** `Cache-Control: private, no-store, max-age=0` |
| | `dynamic = 'force-dynamic'` (Next route; browser/CDN still use response headers) |

**Assessment:** Immutable caching is correct for timestamped upload keys (original/medium/thumb). No per-variant differentiation required.

**Proposed (minimal):**

- Extract header helper; add `X-Content-Type-Options: nosniff` on successful image responses.
- Keep 404 non-cacheable.

---

## 4. Feed lazy loading / virtualization

| Surface | Behavior | Virtualization |
|---------|----------|----------------|
| Web `ListingsView` | Paginated grid (e.g. 20/page), all cards in DOM | Pagination limits DOM size — **no full virtualizer needed** |
| Web `ListingCard` | All `loading="lazy"` | First-row priority missing |
| Mobile `HomeScreen` | `FlatList` 2 columns | Built-in windowing; tune `initialNumToRender` / `windowSize` |
| Mobile detail | `ScrollView` carousel | Few images — OK |

**Not implementing:** react-window / full grid virtualization (SEO, layout, regression risk).

---

## 5. Risks summary

| Change | Risk | Mitigation |
|--------|------|------------|
| Mobile medium URLs | 404 if variant missing | Fallback chain + `getListingImageUrl` defaults to original path |
| Editorial medium | SSR path change only | Same `onError` N/A on server; client strips rare |
| ListingCard eager first row | Slightly more early bandwidth | Cap at 4 images |
| Cache headers | CDN/browser stickiness | 404 stays no-store; keys immutable |

---

## 6. Files to touch (planned)

| File | Change |
|------|--------|
| `lib/listing-image-variants.ts` | `getNextListingImageFallbackVariant` for RN |
| `apps/mobile/src/utils/listingPhotos.ts` | Variant URIs |
| `apps/mobile/src/components/ListingPhotoImage.tsx` | **New** — fallback `Image` |
| `apps/mobile/src/screens/HomeScreen.tsx` | `ListingPhotoImage`, FlatList props |
| `apps/mobile/src/screens/FavoritesScreen.tsx` | `ListingPhotoImage` |
| `apps/mobile/src/screens/ListingDetailsScreen.tsx` | Medium gallery URIs + `ListingPhotoImage` |
| `app/api/uploads/serve/route.ts` | Header helper + `nosniff` |
| `app/components/ListingCard.tsx` | `imagePriority` prop |
| `app/components/ListingsView.tsx` | Priority first 4 |
| `app/components/seo/HomeEditorialSeoStrip.tsx` | Medium + first eager |
| `tests/unit/listing-image-variants.test.ts` | Fallback helper test |
| `tests/unit/mobile-listing-photos.test.ts` | **New** — URI helpers |

**Not touching:** auth, Stripe, uploads POST handler, Prisma, nginx, PM2, `.env`, originals on disk.
