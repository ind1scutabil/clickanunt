/**
 * Public listing serialization — default-deny allowlist.
 *
 * Public / non-owner responses are built by copying only approved keys.
 * A new Prisma column must not appear in the public API until added here.
 *
 * Owner/admin receive the authorized Prisma payload (pass-through) for edit /
 * promote / messages / moderation tools.
 *
 * PRODUCT NOTE: `contactPhone` is intentionally public (listing contact reveal).
 * It is NOT the same as `owner.phone` / `owner.businessPhone`, which are
 * account PII and stay owner/admin-only.
 */

/** Top-level listing keys allowed for anonymous / non-owner JSON. */
export const PUBLIC_LISTING_KEYS = [
  "id",
  "ownerUserId",
  "title",
  "category",
  "subcategory",
  "description",
  "condition",
  "photos",
  "county",
  "city",
  "region",
  "contactPhone",
  "make",
  "model",
  "year",
  "mileage",
  "fuel",
  "transmission",
  "vin",
  "isDealer",
  "dealerBrands",
  "dealerPriceMin",
  "dealerPriceMax",
  "attributes",
  "status",
  "views",
  "isFeatured",
  "feedBoost",
  "isPromoted",
  "promotionType",
  "promotionExpiresAt",
  "promotionStartedAt",
  "moderationStatus",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "expiresAt",
  "priceAmount",
  "priceCurrency",
  "owner",
] as const;

/** Owner object keys allowed for anonymous / non-owner JSON. */
export const PUBLIC_OWNER_KEYS = [
  "id",
  "name",
  "businessName",
  "avatar",
  "phoneVerified",
  "emailVerified",
  "trustScore",
  "totalSales",
  "averageRating",
  "totalListings",
  "responseRate",
  "createdAt",
] as const;

export type PublicListingKey = (typeof PUBLIC_LISTING_KEYS)[number];
export type PublicOwnerKey = (typeof PUBLIC_OWNER_KEYS)[number];

export type ListingOwnerLike = Record<string, unknown> | null | undefined;

const PUBLIC_LISTING_KEY_SET = new Set<string>(PUBLIC_LISTING_KEYS);
const PUBLIC_OWNER_KEY_SET = new Set<string>(PUBLIC_OWNER_KEYS);

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Explicit public owner object — never spread the Prisma user row.
 */
export function toPublicListingOwner(owner: ListingOwnerLike): Record<string, unknown> | null {
  if (!owner || typeof owner !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_OWNER_KEYS) {
    if (hasOwn(owner, key)) out[key] = owner[key];
  }
  return out;
}

/**
 * Full owner object for the listing owner or staff (edit / promote / messages / admin).
 */
export function toOwnerAdminListingOwner(owner: ListingOwnerLike): ListingOwnerLike {
  return owner ?? null;
}

/**
 * Explicit public listing payload — never spread the full listing row then omit.
 */
export function toPublicListingPayload(
  listing: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_LISTING_KEYS) {
    if (key === "owner") continue;
    if (hasOwn(listing, key)) out[key] = listing[key];
  }
  if (hasOwn(listing, "owner")) {
    out.owner = toPublicListingOwner(listing.owner as ListingOwnerLike);
  }
  return out;
}

export function sanitizeListingPayloadForViewer<T extends Record<string, unknown>>(
  listing: T,
  opts: { isOwnerOrAdmin: boolean },
): T | Record<string, unknown> {
  if (opts.isOwnerOrAdmin) {
    return listing;
  }
  return toPublicListingPayload(listing);
}

/** True if a payload still contains account email (for tests / assertions). */
export function listingPayloadContainsOwnerEmail(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const owner = (payload as { owner?: { email?: unknown } }).owner;
  return typeof owner?.email === "string" && owner.email.length > 0;
}

/** Keys that must never appear on a public listing payload (defense-in-depth checks). */
export const PUBLIC_FORBIDDEN_LISTING_KEYS = [
  "moderationNotes",
  "scamFlags",
  "scamScore",
  "isScamSuspected",
  "isDuplicate",
  "duplicateOfId",
  "moderatedBy",
  "moderatedAt",
  "deletedAt",
  "email",
  "phone",
  "businessPhone",
  "role",
  "stripeCustomerId",
  "stripePaymentIntentId",
  "ip",
  "ipAddress",
  "sessionId",
] as const;

export const PUBLIC_FORBIDDEN_OWNER_KEYS = [
  "email",
  "phone",
  "businessPhone",
  "role",
  "subscriptionTier",
  "password",
  "passwordHash",
  "stripeCustomerId",
  "ip",
  "ipAddress",
  "sessionId",
] as const;

export function isPublicListingKey(key: string): boolean {
  return PUBLIC_LISTING_KEY_SET.has(key);
}

export function isPublicOwnerKey(key: string): boolean {
  return PUBLIC_OWNER_KEY_SET.has(key);
}
