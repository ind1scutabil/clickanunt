import type { ListingStatus, ModerationStatus } from '@prisma/client';

/** Shape used by listing metadata / JSON-LD — keep aligned with marketplace “public browse” assumptions. */
export type ListingSeoEligibilityShape = {
  deletedAt: Date | null;
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  expiresAt: Date | null;
};

/**
 * True only when Google should index canonical listing URLs (active, approved, not expired/deleted/rejected/hidden drafts).
 */
export function isListingSeoIndexable(l: ListingSeoEligibilityShape): boolean {
  if (l.deletedAt != null) return false;
  if (l.status !== 'active') return false;
  if (l.expiresAt != null && l.expiresAt < new Date()) return false;
  if (l.moderationStatus === 'rejected' || l.moderationStatus === 'flagged') return false;
  return l.moderationStatus === 'approved';
}
