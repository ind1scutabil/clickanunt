/**
 * Persisted listing.photos cleanup: drop draft temp paths, blob: previews, blocked hosts,
 * and anything that fails listing image policy. Keeps normalized URLs for valid uploads.
 */

import { isValidListingPhotoUrl, normalizeListingPhotoUrl } from './listing-photo-url';

export { isDraftTempListingPhotoUrl } from './listing-photo-url';

export function sanitizeListingPhotos(photos: string[]): {
  kept: string[];
  removed: string[];
} {
  const removed: string[] = [];
  const kept: string[] = [];
  for (const raw of photos ?? []) {
    if (typeof raw !== 'string') continue;
    const p = raw.trim();
    if (!p) continue;
    if (p.startsWith('blob:')) {
      removed.push(raw);
      continue;
    }
    if (!isValidListingPhotoUrl(p)) {
      removed.push(raw);
      continue;
    }
    const n = normalizeListingPhotoUrl(p);
    if (n) {
      kept.push(n);
    } else {
      removed.push(raw);
    }
  }
  return { kept, removed };
}
