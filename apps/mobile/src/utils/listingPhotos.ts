/**
 * Listing imagery — delegates to `lib/listing-photo-url.ts` (same rules as web).
 * React Native requires absolute `Image` URIs; we resolve relative/default paths against `MOBILE_CONFIG.siteUrl`.
 */
import {
  DEFAULT_LISTING_IMAGE_URL,
  listingPrimaryPhotoSrc,
  normalizeListingPhotosArray,
  setListingPhotoSiteOriginOverride,
} from '../../../../lib/listing-photo-url';
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
 * First displayable photo — same selection as web `listingPrimaryPhotoSrc` (valid uploads only; no stock URLs).
 * Empty `photos` → site default asset only.
 */
export function primaryListingPhotoUri(photos: string[] | undefined | null): string {
  const path = listingPrimaryPhotoSrc(photos);
  return toAbsoluteImageUri(path);
}

/**
 * Gallery URLs for detail screen — normalized valid URLs, or default asset when none.
 */
export function listingPhotoGalleryUris(photos: string[] | undefined | null): string[] {
  const normalized = normalizeListingPhotosArray(photos);
  if (normalized.length === 0) {
    return [toAbsoluteImageUri(DEFAULT_LISTING_IMAGE_URL)];
  }
  return normalized.map(toAbsoluteImageUri);
}
