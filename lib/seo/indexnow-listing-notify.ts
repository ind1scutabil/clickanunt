/**
 * Central IndexNow decision for listing mutations.
 * Routes must call this AFTER a successful create/update — never before.
 * At most one enqueue per call (one URL).
 */
import { enqueueIndexNowSafe } from "@/lib/seo/indexnow-client";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

/** Public / index-relevant listing fields (content + visibility signals). */
export const INDEXNOW_PUBLIC_LISTING_FIELDS = new Set([
  "title",
  "description",
  "category",
  "subcategory",
  "city",
  "county",
  "region",
  "priceAmount",
  "priceCurrency",
  "priceType",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryPeriod",
  "photos",
  "make",
  "model",
  "year",
  "mileage",
  "fuel",
  "transmission",
  "vin",
  "condition",
  "attributes",
  "contactPhone",
  "isFeatured",
  "isPromoted",
]);

export type ListingIndexNowSnapshot = {
  status: string | null | undefined;
  deletedAt?: Date | string | null;
};

export function listingIndexNowUrl(listingId: string): string {
  return `${siteOriginForSeoFeeds()}/listings/${listingId}`;
}

/**
 * Decide whether a successful mutation should nudge IndexNow.
 * - Final result must be publicly active (status=active, not soft-deleted).
 * - Transition into active → notify once.
 * - Already active + public field change → notify once.
 * - Pending/rejected/draft/paused/etc. → never.
 * - Status-only reaffirm on already-active (no public fields) → never.
 */
export function shouldNotifyListingIndexNow(opts: {
  before: ListingIndexNowSnapshot;
  after: ListingIndexNowSnapshot;
  changedKeys: readonly string[];
}): boolean {
  const afterStatus = String(opts.after.status ?? "").toLowerCase();
  if (afterStatus !== "active") return false;
  if (opts.after.deletedAt) return false;

  const beforeStatus = String(opts.before.status ?? "").toLowerCase();
  const wasNotPubliclyActive = beforeStatus !== "active" || Boolean(opts.before.deletedAt);
  if (wasNotPubliclyActive) return true;

  return opts.changedKeys.some((k) => INDEXNOW_PUBLIC_LISTING_FIELDS.has(k));
}

/**
 * Fire-and-forget IndexNow after a confirmed DB write.
 * Returns whether a notification was enqueued (for tests).
 */
export function notifyListingIndexNowAfterSuccess(opts: {
  listingId: string;
  before: ListingIndexNowSnapshot;
  after: ListingIndexNowSnapshot;
  changedKeys: readonly string[];
}): boolean {
  if (
    !shouldNotifyListingIndexNow({
      before: opts.before,
      after: opts.after,
      changedKeys: opts.changedKeys,
    })
  ) {
    return false;
  }
  enqueueIndexNowSafe([listingIndexNowUrl(opts.listingId)]);
  return true;
}
