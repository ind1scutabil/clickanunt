import { broadcastAuthSessionChanged } from "@/lib/auth-session-events";

/** Known web auth keys only — never touch listing drafts / cookie consent. */
export const WEB_AUTH_TOKEN_KEYS = ["accessToken", "refreshToken"] as const;
export const WEB_AUTH_STORAGE_KEYS = [
  ...WEB_AUTH_TOKEN_KEYS,
  "user",
] as const;

/**
 * Idempotent cleanup of legacy browser auth mirrors.
 * Does not invent cookies from localStorage tokens.
 */
export function clearLegacyWebAuthStorage(opts?: {
  broadcast?: boolean;
  /** When true (default), also clears cached `user` profile. */
  clearUser?: boolean;
}): boolean {
  if (typeof window === "undefined") return false;
  let cleared = false;
  const keys =
    opts?.clearUser === false
      ? WEB_AUTH_TOKEN_KEYS
      : WEB_AUTH_STORAGE_KEYS;
  for (const key of keys) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      cleared = true;
    }
  }
  try {
    if (sessionStorage.getItem("accessToken") !== null) {
      sessionStorage.removeItem("accessToken");
      cleared = true;
    }
    if (sessionStorage.getItem("refreshToken") !== null) {
      sessionStorage.removeItem("refreshToken");
      cleared = true;
    }
  } catch {
    /* private mode */
  }
  if (cleared && opts?.broadcast !== false) {
    broadcastAuthSessionChanged();
  }
  return cleared;
}

/** Cache non-sensitive user profile for UI only — never tokens. */
export function cacheWebUserProfile(user: {
  id?: string;
  email?: string;
  role?: string;
  name?: string | null;
}): void {
  if (typeof window === "undefined") return;
  // Strip any accidental token fields
  const safe = {
    ...(user.id ? { id: user.id } : {}),
    ...(user.email ? { email: user.email } : {}),
    ...(user.role ? { role: user.role } : {}),
    name: user.name ?? null,
  };
  localStorage.setItem("user", JSON.stringify(safe));
  // Ensure tokens are never left behind after profile cache write
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}
