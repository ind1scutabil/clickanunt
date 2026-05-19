import type { Prisma } from "@prisma/client";
import { activePublicListingExpiryWhere } from "@/lib/listing-expiry";

/**
 * Prisma filter for listings that should be indexed (sitemap + canonical detail pages).
 * Aligned with `isListingSeoIndexable` in listing-seo-eligibility.ts.
 */
export function seoIndexableListingWhere(now: Date = new Date()): Prisma.ListingWhereInput {
  return {
    status: "active",
    deletedAt: null,
    moderationStatus: "approved",
    AND: [activePublicListingExpiryWhere(now)],
  };
}
