/**
 * Backwards-compatible listing image variant URLs.
 * DB continues to store original URLs; display layer requests thumb/medium when present.
 */

import {
  DEFAULT_LISTING_IMAGE_URL,
  LISTING_PHOTO_ONERROR_FALLBACK,
  listingPrimaryPhotoSrc,
  normalizeListingPhotoUrl,
  normalizeListingPhotosArray,
} from "@/lib/listing-photo-url";

export type ListingImageVariant = "thumb" | "medium" | "original";

const SIZE_SEGMENTS = ["original", "thumb", "medium", "large"] as const;

/**
 * Storage key: listings/{id}/{size}/{file}
 */
export function siblingVariantStorageKey(
  originalKey: string,
  variant: "thumb" | "medium"
): string {
  if (!/\/original\//i.test(originalKey)) {
    return originalKey.replace(
      /\/(thumb|medium|large)\//i,
      `/${variant}/`
    );
  }
  return originalKey.replace(/\/original\//i, `/${variant}/`);
}

function replaceSizeInPath(pathOrKey: string, variant: ListingImageVariant): string | null {
  for (const seg of SIZE_SEGMENTS) {
    if (seg === variant) continue;
    if (pathOrKey.includes(`/${seg}/`)) {
      return pathOrKey.replace(`/${seg}/`, `/${variant}/`);
    }
  }
  return null;
}

/**
 * Rewrite a normalized photo URL to a variant path (serve URL or absolute).
 * Returns null if URL has no replaceable size segment (legacy flat uploads).
 */
export function rewriteListingPhotoToVariant(
  normalizedUrl: string,
  variant: ListingImageVariant
): string | null {
  if (!normalizedUrl || variant === "original") {
    return normalizedUrl || null;
  }

  if (normalizedUrl.includes("/api/uploads/serve")) {
    try {
      const isAbsolute = /^https?:\/\//i.test(normalizedUrl);
      const base = isAbsolute ? undefined : "http://local";
      const u = new URL(normalizedUrl, base);
      const key = u.searchParams.get("key");
      if (!key) return null;
      const newKey = replaceSizeInPath(key, variant);
      if (!newKey || newKey === key) return null;
      const servePath = `/api/uploads/serve?key=${encodeURIComponent(newKey)}`;
      if (isAbsolute) {
        return `${u.origin}${servePath}`;
      }
      return servePath;
    } catch {
      return null;
    }
  }

  const replaced = replaceSizeInPath(normalizedUrl, variant);
  return replaced && replaced !== normalizedUrl ? replaced : null;
}

/**
 * Preferred display URL for a listing photo (falls back to original URL in href).
 * Use {@link applyListingImageFallback} on error when variant file may not exist yet.
 */
export function getListingImageUrl(
  photo: string | null | undefined,
  variant: ListingImageVariant,
  originOverride?: string
): string {
  const original = normalizeListingPhotoUrl(photo, originOverride);
  if (!original) return "";
  if (variant === "original") return original;

  const variantUrl = rewriteListingPhotoToVariant(original, variant);
  return variantUrl ?? original;
}

/** Fallback chain: thumb → medium → original → SVG placeholder */
export function listingImageFallbackChain(
  requested: ListingImageVariant
): ListingImageVariant[] {
  if (requested === "thumb") return ["thumb", "medium", "original"];
  if (requested === "medium") return ["medium", "original"];
  return ["original"];
}

/**
 * Advance img src on error through thumb → medium → original (non-destructive).
 */
export function applyListingImageFallback(
  el: HTMLImageElement,
  photo: string,
  requestedVariant: ListingImageVariant,
  originOverride?: string
): void {
  const chain = listingImageFallbackChain(requestedVariant);
  const stage = (el.dataset.listingImgFallback as ListingImageVariant | undefined) ?? requestedVariant;
  const idx = chain.indexOf(stage);
  const next = idx >= 0 ? chain[idx + 1] : undefined;

  if (next) {
    el.dataset.listingImgFallback = next;
    el.src = getListingImageUrl(photo, next, originOverride);
    return;
  }

  el.onerror = null;
  delete el.dataset.listingImgFallback;
  el.src = LISTING_PHOTO_ONERROR_FALLBACK;
}

export function listingPrimaryPhotoSrcForVariant(
  photos: unknown,
  variant: ListingImageVariant,
  secondary?: unknown
): string {
  const primary = normalizeListingPhotosArray(photos);
  const extra = normalizeListingPhotosArray(secondary);
  const first = primary[0] || extra[0];
  if (!first) return DEFAULT_LISTING_IMAGE_URL;
  return getListingImageUrl(first, variant);
}

/** @deprecated use listingPrimaryPhotoSrcForVariant — kept for imports */
export { listingPrimaryPhotoSrc };
