/**
 * Listing create/publish rate limits — authenticated bulk-safe, spam-aware.
 * Used by validateSecureRequest presets (see lib/rate-limit-distributed.ts).
 */

export const LISTING_PUBLISH_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Final publish POST /api/listings — authenticated users (successful publishes / 24h). */
export const LISTING_PUBLISH_MAX_AUTHENTICATED = 100;

/** Admin / moderator bulk operations. */
export const LISTING_PUBLISH_MAX_PRIVILEGED = 500;

/** Unauthenticated attempts on publish routes (IP only). */
export const LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR = 8;

export const LISTING_DRAFT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LISTING_DRAFT_MAX_PER_USER = 200;

export const LISTING_UPDATE_WINDOW_MS = 60 * 60 * 1000;
export const LISTING_UPDATE_MAX_PER_USER = 80;

const PRIVILEGED_ROLES = new Set(['admin', 'moderator', 'owner']);

export function isPrivilegedListingRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return PRIVILEGED_ROLES.has(role.trim().toLowerCase());
}

export function listingPublishMaxForRole(role: string | null | undefined): number {
  return isPrivilegedListingRole(role)
    ? LISTING_PUBLISH_MAX_PRIVILEGED
    : LISTING_PUBLISH_MAX_AUTHENTICATED;
}

export type ListingRateLimitPresetKind =
  | 'listing_publish'
  | 'listing_draft'
  | 'listing_update'
  | 'listings';

export function formatSecureRateLimitErrorRo(
  preset: ListingRateLimitPresetKind | string,
  retryAfterSec: number
): string {
  const sec = Math.max(1, Math.ceil(retryAfterSec));
  const min = Math.ceil(sec / 60);

  switch (preset) {
    case 'listing_publish':
    case 'listings':
      return `Ai atins limita de publicare anunțuri (maxim ${LISTING_PUBLISH_MAX_AUTHENTICATED} publicări reușite în 24 de ore). Încearcă din nou peste ${sec} secunde${min >= 2 ? ` (aprox. ${min} minute)` : ''}.`;
    case 'listing_draft':
      return `Prea multe salvări de ciornă. Încearcă din nou peste ${sec} secunde.`;
    case 'listing_update':
      return `Prea multe actualizări de anunț într-un interval scurt. Încearcă din nou peste ${sec} secunde.`;
    default:
      return `Prea multe cereri. Încearcă din nou peste ${sec} secunde.`;
  }
}
