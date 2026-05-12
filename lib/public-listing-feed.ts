/**
 * Filters for public “real marketplace” surfaces (homepage, editorial strip).
 * Does not delete DB rows — only excludes from API/query results.
 */

import type { Prisma } from "@prisma/client";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";

/** High-confidence junk tokens (substring, case-insensitive). Safe for Prisma NOT contains. */
const TITLE_SUBSTRING_BLOCKLIST = [
  "e2e",
  "lorem ipsum",
  "placeholder listing",
  "test listing",
  "demo listing",
  "sample listing",
  "fake listing",
  "proof listing",
] as const;

const TITLE_SUBSTRING_BLOCKLIST_SHORT = ["e2e", "lorem ipsum", "placeholder listing"] as const;

const UUID_TITLE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extra heuristics applied in memory (avoids Prisma false positives like “waterproof”). */
const JUNK_WORD_RE =
  /\b(e2e|proof|test|demo|sample|placeholder|lorem|fake)\b/i;

export function buildPublicMarketplaceTitlePrismaFilter(): Prisma.ListingWhereInput {
  return {
    AND: TITLE_SUBSTRING_BLOCKLIST_SHORT.map((frag) => ({
      NOT: { title: { contains: frag, mode: "insensitive" } },
    })),
  };
}

/** Prisma `AND` may be a single object or an array — normalize for spreading into `where.AND` arrays. */
export function publicMarketplaceTitleAndClauses(): Prisma.ListingWhereInput[] {
  const block = buildPublicMarketplaceTitlePrismaFilter();
  if (!block.AND) return [];
  return Array.isArray(block.AND) ? block.AND : [block.AND];
}

export function listingTitleFailsPublicShowcase(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (t.length < 3) return true;
  if (UUID_TITLE_RE.test(t)) return true;
  const lower = t.toLowerCase();
  for (const frag of TITLE_SUBSTRING_BLOCKLIST) {
    if (lower.includes(frag)) return true;
  }
  if (JUNK_WORD_RE.test(t)) return true;
  return false;
}

export function listingHasApprovedShowcasePhotos(
  photos: unknown,
  origin: string
): boolean {
  return normalizeListingPhotosArray(photos, origin).length > 0;
}

export function listingPassesPublicShowcase(
  row: { title: string; photos: unknown },
  origin: string,
  normalizedPhotos?: string[]
): boolean {
  if (listingTitleFailsPublicShowcase(row.title)) return false;
  const photos =
    normalizedPhotos ?? normalizeListingPhotosArray(row.photos, origin);
  if (photos.length === 0) return false;
  return true;
}

/** Client + server — strip e2e/sample/temp fixtures from homepage “Live acum” cards. */
export function listingExcludedFromHomeHeroPreview(row: {
  id: string;
  title: string;
  photos: unknown;
}): boolean {
  if (listingTitleFailsPublicShowcase(row.title)) return true;
  if (/^listing-sample/i.test(row.id) || /^temp-/i.test(row.id)) return true;
  const photos = normalizeListingPhotosArray(row.photos);
  for (const p of photos) {
    if (/e2e-verification|placeholder\.jpg|\/temp-/i.test(p)) return true;
  }
  return false;
}
