/**
 * Compare create payload vs existing listing for uploadSessionId replay.
 * Same session + different content → conflict (do not silently return wrong listing).
 */

export type IdempotentListingSnapshot = {
  title?: string | null;
  category?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  county?: string | null;
  city?: string | null;
  photos?: unknown;
  make?: string | null;
  model?: string | null;
};

function normStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function photosKey(photos: unknown): string {
  if (!Array.isArray(photos)) return "";
  return JSON.stringify(photos.map((p) => String(p)));
}

export function listingCreatePayloadMatchesExisting(
  existing: IdempotentListingSnapshot,
  body: IdempotentListingSnapshot
): boolean {
  if (normStr(existing.title) !== normStr(body.title)) return false;
  if (normStr(existing.category) !== normStr(body.category)) return false;
  if (Number(existing.priceAmount) !== Number(body.priceAmount)) return false;
  if (
    normStr(existing.priceCurrency || "RON") !==
    normStr(body.priceCurrency || "RON")
  ) {
    return false;
  }
  if (normStr(existing.county) !== normStr(body.county)) return false;
  if (normStr(existing.city) !== normStr(body.city)) return false;
  if (photosKey(existing.photos) !== photosKey(body.photos)) return false;
  if (normStr(existing.make) !== normStr(body.make)) return false;
  if (normStr(existing.model) !== normStr(body.model)) return false;
  return true;
}
