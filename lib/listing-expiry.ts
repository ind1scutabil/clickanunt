import type { Prisma } from "@prisma/client";

/** Standard free listing lifetime (days from publish). */
export const LISTING_STANDARD_DURATION_DAYS = 30;

export type ListingExpiryFields = {
  expiresAt?: Date | string | null;
  createdAt?: Date | string | null;
  publishedAt?: Date | string | null;
};

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** Listing ad lifetime end date from a publish/base date. */
export function calculateListingExpiryDate(
  baseDate: Date | string,
  durationDays: number = LISTING_STANDARD_DURATION_DAYS
): Date {
  const base = toDate(baseDate);
  const result = new Date(base.getTime());
  result.setUTCDate(result.getUTCDate() + durationDays);
  return result;
}

/** DB value when set; otherwise publishedAt/createdAt + standard duration (display / owner tab only). */
export function resolveListingExpiresAt(listing: ListingExpiryFields): Date {
  if (listing.expiresAt != null && listing.expiresAt !== "") {
    return toDate(listing.expiresAt);
  }
  const base = listing.publishedAt ?? listing.createdAt;
  if (base != null && base !== "") {
    return calculateListingExpiryDate(base);
  }
  return calculateListingExpiryDate(new Date());
}

/** True when resolved expiry (incl. fallback) is in the past — owner dashboard tab. */
export function isListingDateExpired(
  listing: ListingExpiryFields,
  now: Date = new Date()
): boolean {
  return resolveListingExpiresAt(listing).getTime() < now.getTime();
}

/** True only when `expiresAt` is stored and past — safe public catalog / detail hiding. */
export function isListingExplicitlyExpired(
  listing: { expiresAt?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (listing.expiresAt == null || listing.expiresAt === "") return false;
  return toDate(listing.expiresAt).getTime() < now.getTime();
}

export function formatListingExpiryDateRO(date: Date | string): string {
  return toDate(date).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatListingExpiryDisplay(listing: ListingExpiryFields): string {
  return formatListingExpiryDateRO(resolveListingExpiresAt(listing));
}

/** Fields to set on first publish (create active or moderation approve). */
export function listingPublishExpiryFields(now: Date = new Date()): {
  publishedAt: Date;
  expiresAt: Date;
} {
  return {
    publishedAt: now,
    expiresAt: calculateListingExpiryDate(now),
  };
}

/** Set publish/expiry only when missing — preserves existing on re-approve or edit. */
export function applyListingPublishExpiryIfMissing(
  existing: { publishedAt?: Date | null; expiresAt?: Date | null },
  now: Date = new Date()
): { publishedAt?: Date; expiresAt?: Date } {
  if (existing.publishedAt && existing.expiresAt) {
    return {};
  }
  const fields = listingPublishExpiryFields(now);
  const out: { publishedAt?: Date; expiresAt?: Date } = {};
  if (!existing.publishedAt) out.publishedAt = fields.publishedAt;
  if (!existing.expiresAt) out.expiresAt = fields.expiresAt;
  return out;
}

/** Public active feed: hide only rows with explicit past `expiresAt` (legacy null stays visible). */
export function activePublicListingExpiryWhere(
  now: Date = new Date()
): Prisma.ListingWhereInput {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}
