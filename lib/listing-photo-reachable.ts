import { listingPrimaryPhotoSrcForVariant } from "@/lib/listing-image-variants";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";

/** Storage key from `/api/uploads/serve?key=...` (decoded). */
export function extractListingPhotoServeKey(photoUrl: string): string | null {
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;
  try {
    const base = /^https?:\/\//i.test(trimmed) ? undefined : "http://local";
    const u = new URL(trimmed, base);
    const key = u.searchParams.get("key");
    return key?.trim() || null;
  } catch {
    return null;
  }
}

/** True when the serve key lives under `listings/{listingId}/`. */
export function listingPhotoServeKeyMatchesListing(
  listingId: string,
  photoUrl: string
): boolean {
  const key = extractListingPhotoServeKey(photoUrl);
  if (!key) return false;
  return key.startsWith(`listings/${listingId}/`);
}

/**
 * HEAD-check primary display URL (medium variant). Used client-side to skip broken homepage cards.
 */
export async function isListingPrimaryPhotoReachable(
  photos: unknown,
  signal?: AbortSignal
): Promise<boolean> {
  const normalized = normalizeListingPhotosArray(photos);
  if (normalized.length === 0) return false;
  const src = listingPrimaryPhotoSrcForVariant(normalized, "medium");
  if (!src || src.startsWith("/images/") || src.startsWith("data:")) return false;
  try {
    const res = await fetch(src, { method: "HEAD", cache: "no-store", signal });
    return res.ok;
  } catch {
    return false;
  }
}

export async function filterListingsWithReachablePrimaryPhoto<T extends { photos: unknown }>(
  rows: T[],
  targetCount: number
): Promise<T[]> {
  const out: T[] = [];
  for (const row of rows) {
    if (out.length >= targetCount) break;
    if (await isListingPrimaryPhotoReachable(row.photos)) {
      out.push(row);
    }
  }
  return out;
}
