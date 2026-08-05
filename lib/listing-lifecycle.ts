/**
 * Canonical listing lifecycle helpers (server authority).
 * Transitions are derived from Prisma ListingStatus + existing API behaviour —
 * not invented product policy.
 */

import type { ListingStatus, ModerationStatus } from '@prisma/client';
import {
  isListingExplicitlyExpired,
  listingPublishExpiryFields,
} from '@/lib/listing-expiry';

export const LISTING_STATUSES = [
  'draft',
  'pending',
  'active',
  'paused',
  'expired',
  'sold',
  'deleted',
  'rejected',
  'hidden',
] as const satisfies ReadonlyArray<ListingStatus>;

export type ListingLifecycleShape = {
  status: ListingStatus | string;
  moderationStatus?: ModerationStatus | string | null;
  deletedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  ownerUserId?: string;
};

/** Owner may request these status writes via PATCH (server still validates from-state). */
export const OWNER_STATUS_TRANSITIONS: Readonly<
  Record<string, ReadonlyArray<ListingStatus>>
> = {
  active: ['paused', 'pending'], // pending = renew when date-expired
  paused: ['pending'],
  hidden: ['pending'],
  rejected: ['pending'],
  expired: ['pending'],
};

export function normalizeListingStatus(status: unknown): string {
  return String(status ?? '').toLowerCase();
}

/**
 * Paid promotion eligibility — must match public indexability core
 * (active + approved + not deleted + not past expiresAt).
 * Legacy expiresAt=null remains eligible (same as public feed).
 */
export function isListingPromotionEligible(
  listing: ListingLifecycleShape,
  now: Date = new Date()
): boolean {
  if (listing.deletedAt != null && listing.deletedAt !== '') return false;
  if (normalizeListingStatus(listing.status) !== 'active') return false;
  const mod = normalizeListingStatus(listing.moderationStatus ?? 'approved');
  if (mod !== 'approved') return false;
  if (isListingExplicitlyExpired({ expiresAt: listing.expiresAt }, now)) {
    return false;
  }
  return true;
}

export function promotionIneligibleReason(
  listing: ListingLifecycleShape,
  now: Date = new Date()
): string | null {
  if (isListingPromotionEligible(listing, now)) return null;
  if (listing.deletedAt != null && listing.deletedAt !== '') {
    return 'Listing is deleted';
  }
  if (normalizeListingStatus(listing.status) !== 'active') {
    return 'Only active listings can be promoted';
  }
  const mod = normalizeListingStatus(listing.moderationStatus ?? '');
  if (mod && mod !== 'approved') {
    return 'Listing is not approved for public display';
  }
  if (isListingExplicitlyExpired({ expiresAt: listing.expiresAt }, now)) {
    return 'Listing has expired';
  }
  return 'Listing is not eligible for promotion';
}

export type OwnerStatusDecision =
  | { ok: true; status: ListingStatus; moderationStatus?: ModerationStatus; clearExpiresAt?: boolean }
  | { ok: false; error: string };

/**
 * Validate owner-requested status change.
 * Reactivation / renew always goes through moderation (pending).
 */
export function resolveOwnerStatusTransition(
  current: ListingLifecycleShape,
  requestedStatus: string,
  now: Date = new Date()
): OwnerStatusDecision {
  const from = normalizeListingStatus(current.status);
  const to = normalizeListingStatus(requestedStatus) as ListingStatus;

  if (from === 'deleted' || current.deletedAt) {
    return { ok: false, error: 'Listing-ul șters nu poate fi modificat' };
  }

  const allowed = OWNER_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return { ok: false, error: 'Tranziție de status nepermisă' };
  }

  if (to === 'paused') {
    if (from !== 'active') {
      return { ok: false, error: 'Doar anunțurile active pot fi dezactivate' };
    }
    if (isListingExplicitlyExpired({ expiresAt: current.expiresAt }, now)) {
      return { ok: false, error: 'Anunțul expirat nu poate fi doar dezactivat — folosește prelungirea' };
    }
    return { ok: true, status: 'paused' };
  }

  if (to === 'pending') {
    // Renew path: active + past expiresAt, or status=expired
    if (from === 'active') {
      if (!isListingExplicitlyExpired({ expiresAt: current.expiresAt }, now)) {
        return {
          ok: false,
          error: 'Anunțul activ neexpirat nu poate fi retrimis la moderare doar prin status',
        };
      }
      return {
        ok: true,
        status: 'pending',
        moderationStatus: 'pending',
        clearExpiresAt: true,
      };
    }
    if (from === 'expired') {
      return {
        ok: true,
        status: 'pending',
        moderationStatus: 'pending',
        clearExpiresAt: true,
      };
    }
    // paused / hidden / rejected → pending (reactivate via moderation)
    return {
      ok: true,
      status: 'pending',
      moderationStatus: 'pending',
    };
  }

  return { ok: false, error: 'Tranziție de status nepermisă' };
}

/**
 * On moderation approve: set publish/expiry if missing, or refresh expiresAt when past.
 */
export function applyListingPublishExpiryOnApprove(
  existing: { publishedAt?: Date | null; expiresAt?: Date | null },
  now: Date = new Date()
): { publishedAt?: Date; expiresAt?: Date } {
  const fields = listingPublishExpiryFields(now);
  const out: { publishedAt?: Date; expiresAt?: Date } = {};
  if (!existing.publishedAt) {
    out.publishedAt = fields.publishedAt;
  }
  if (
    !existing.expiresAt ||
    isListingExplicitlyExpired({ expiresAt: existing.expiresAt }, now)
  ) {
    out.expiresAt = fields.expiresAt;
    // Treat past-expiry approve as a fresh publish window.
    if (existing.expiresAt && isListingExplicitlyExpired({ expiresAt: existing.expiresAt }, now)) {
      out.publishedAt = fields.publishedAt;
    }
  }
  return out;
}
