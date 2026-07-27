/**
 * Client favorites: account API when authenticated, localStorage for guests.
 * Unifies card + detail keys onto clickanunt_saved_listing_ids_v1.
 */
import { getCsrfToken } from "@/lib/security/csrf-client";
import {
  isListingSaved,
  toggleSavedListingId,
} from "@/lib/recent-listings-storage";

const LEGACY_DETAIL_KEY = "favorites";

/** Hint that a cookie session may exist (UI profile cache — not a JWT). */
function hasCachedWebUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("user") !== null;
  } catch {
    return false;
  }
}

/** Migrate legacy detail-page key into the canonical local saved ids. */
export function migrateLegacyFavoriteKeys(): void {
  if (typeof window === "undefined") return;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_DETAIL_KEY) || "[]");
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const cur = new Set(
      (() => {
        try {
          const raw = JSON.parse(localStorage.getItem("clickanunt_saved_listing_ids_v1") || "[]");
          return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
        } catch {
          return [] as string[];
        }
      })()
    );
    let changed = false;
    for (const id of legacy) {
      if (typeof id === "string" && !cur.has(id)) {
        cur.add(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("clickanunt_saved_listing_ids_v1", JSON.stringify([...cur]));
    }
    localStorage.removeItem(LEGACY_DETAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function isFavoriteLocal(listingId: string): boolean {
  migrateLegacyFavoriteKeys();
  return isListingSaved(listingId);
}

export type FavoriteToggleResult = {
  saved: boolean;
  via: "api" | "local";
  error?: string;
  /** When true, caller should send the user to login. */
  needsAuth?: boolean;
};

/**
 * Toggle favorite. Authenticated users hit /api/favorites (CSRF on mutate).
 * Guests keep a local-only list (same key as ListingCard).
 */
export async function toggleFavoriteListing(listingId: string): Promise<FavoriteToggleResult> {
  migrateLegacyFavoriteKeys();
  const currentlySaved = isListingSaved(listingId);
  const tryApi = hasCachedWebUser();

  if (!tryApi) {
    const saved = toggleSavedListingId(listingId);
    return { saved, via: "local" };
  }

  try {
    if (currentlySaved) {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/favorites?listingId=${encodeURIComponent(listingId)}`, {
        method: "DELETE",
        headers: {
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        credentials: "include",
      });
      if (res.status === 401) {
        const saved = toggleSavedListingId(listingId);
        return { saved, via: "local", needsAuth: true };
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return {
          saved: currentlySaved,
          via: "api",
          error: body.error || `Eroare (${res.status})`,
        };
      }
      if (isListingSaved(listingId)) toggleSavedListingId(listingId);
      return { saved: false, via: "api" };
    }

    const csrf = await getCsrfToken();
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ listingId }),
    });
    if (res.status === 401) {
      const saved = toggleSavedListingId(listingId);
      return { saved, via: "local", needsAuth: true };
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (String(body.error || "").toLowerCase().includes("already")) {
        if (!isListingSaved(listingId)) toggleSavedListingId(listingId);
        return { saved: true, via: "api" };
      }
      return {
        saved: currentlySaved,
        via: "api",
        error: body.error || "Nu s-a putut adăuga la favorite",
      };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        saved: currentlySaved,
        via: "api",
        error: body.error || `Eroare (${res.status})`,
      };
    }
    if (!isListingSaved(listingId)) toggleSavedListingId(listingId);
    return { saved: true, via: "api" };
  } catch {
    return {
      saved: currentlySaved,
      via: "api",
      error: "Nu s-a putut actualiza favoritele",
    };
  }
}
