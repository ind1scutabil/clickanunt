/**
 * Listing imagery — delegates to shared web libs (same variant rules as web).
 * React Native requires absolute `Image` URIs; we resolve relative/default paths against `MOBILE_CONFIG.siteUrl`.
 */
import {
  DEFAULT_LISTING_IMAGE_URL,
  LISTING_PHOTO_ONERROR_FALLBACK,
  normalizeListingPhotosArray,
  setListingPhotoSiteOriginOverride,
} from '../../../../lib/listing-photo-url';
import {
  getListingImageUrl,
  getNextListingImageFallbackVariant,
  listingPrimaryPhotoSrcForVariant,
  type ListingImageVariant,
} from '../../../../lib/listing-image-variants';
import { MOBILE_CONFIG } from '../config';

const base = MOBILE_CONFIG.siteUrl.replace(/\/$/, '');

setListingPhotoSiteOriginOverride(base);

function toAbsoluteImageUri(src: string): string {
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  ) {
    return src;
  }
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${base}${path}`;
}

/**
 * Single photo URL for a variant (medium/thumb/original). Falls back to original path when rewrite unavailable.
 */
export function listingPhotoUri(
  photo: string | null | undefined,
  variant: ListingImageVariant
): string {
  if (!photo) {
    return toAbsoluteImageUri(DEFAULT_LISTING_IMAGE_URL);
  }
  const path = getListingImageUrl(photo, variant);
  return toAbsoluteImageUri(path || DEFAULT_LISTING_IMAGE_URL);
}

/**
 * Card / list hero — medium variant (fallback to original URL in href when no size segment).
 */
export function primaryListingPhotoUri(photos: string[] | undefined | null): string {
  const path = listingPrimaryPhotoSrcForVariant(photos, 'medium');
  return toAbsoluteImageUri(path);
}

/**
 * Small thumbnails (e.g. gallery strip).
 */
export function listingThumbPhotoUri(photo: string | null | undefined): string {
  return listingPhotoUri(photo, 'thumb');
}

/**
 * Full-resolution — modal / pinch-zoom only.
 */
export function listingOriginalPhotoUri(photo: string | null | undefined): string {
  return listingPhotoUri(photo, 'original');
}

/**
 * Detail carousel — medium for on-screen slides (not full originals).
 */
export function listingPhotoGalleryUris(photos: string[] | undefined | null): string[] {
  const normalized = normalizeListingPhotosArray(photos);
  if (normalized.length === 0) {
    return [toAbsoluteImageUri(DEFAULT_LISTING_IMAGE_URL)];
  }
  return normalized.map((p) => listingPhotoUri(p, 'medium'));
}

export function listingPhotoErrorFallbackUri(
  photo: string,
  requested: ListingImageVariant,
  failed: ListingImageVariant
): string {
  const next = getNextListingImageFallbackVariant(requested, failed);
  if (!next) {
    return toAbsoluteImageUri(LISTING_PHOTO_ONERROR_FALLBACK);
  }
  return listingPhotoUri(photo, next);
}
