/** Client-only: recently viewed listing snapshots for homepage “Recently viewed”. */

export type RecentListingSnapshot = {
  id: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  photo?: string | null;
  category?: string;
  viewedAt: number;
};

const KEY = "clickanunt_recent_listings_v1";

export function pushRecentListingSnapshot(
  row: Omit<RecentListingSnapshot, "viewedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || "[]") as RecentListingSnapshot[];
    const next = [{ ...row, viewedAt: Date.now() }, ...prev.filter((x) => x.id !== row.id)].slice(
      0,
      12
    );
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function readRecentListingSnapshots(): RecentListingSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

const FAV_KEY = "clickanunt_saved_listing_ids_v1";

export function readSavedListingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleSavedListingId(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cur = readSavedListingIds();
    const has = cur.includes(id);
    const next = has ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    return !has;
  } catch {
    return false;
  }
}

export function isListingSaved(id: string): boolean {
  return readSavedListingIds().includes(id);
}
