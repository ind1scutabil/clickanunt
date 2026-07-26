/**
 * Cookie consent helpers — storage key and safe preference paths (no invented legal claims).
 */
export const COOKIE_CONSENT_STORAGE_KEY = "clickanunt_cookie_consent_v1";

/** Stable in-app paths where users can manage cookie preferences. */
export const COOKIE_PREFERENCE_PATHS = ["/cookies"] as const;

/** First-party analytics cookie name prefixes/names we may clear on withdraw. */
export const FIRST_PARTY_ANALYTICS_COOKIE_NAMES = ["_ga", "_clck", "_clsk"] as const;

export function isFirstPartyAnalyticsCookieName(name: string): boolean {
  if (name === "_ga" || name === "_clck" || name === "_clsk") return true;
  if (name.startsWith("_ga_")) return true;
  if (name.startsWith("_cl") && name.length <= 12) return true;
  return false;
}

export function isCookiePreferencePath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  return (COOKIE_PREFERENCE_PATHS as readonly string[]).includes(path);
}

export type StoredCookieConsent = {
  v: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function parseStoredCookieConsent(raw: string | null): StoredCookieConsent | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<StoredCookieConsent>;
    if (o?.v !== 1 || o.necessary !== true) return null;
    // Strict booleans only — do not coerce "yes"/1 into accept.
    if (typeof o.analytics !== "boolean" || typeof o.marketing !== "boolean") return null;
    return {
      v: 1,
      necessary: true,
      analytics: o.analytics,
      marketing: o.marketing,
      decidedAt: typeof o.decidedAt === "string" ? o.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(
  c: Omit<StoredCookieConsent, "v" | "necessary"> & Partial<Pick<StoredCookieConsent, "decidedAt">>
): string {
  const payload: StoredCookieConsent = {
    v: 1,
    necessary: true,
    analytics: c.analytics,
    marketing: c.marketing,
    decidedAt: c.decidedAt ?? new Date().toISOString(),
  };
  return JSON.stringify(payload);
}

export function dispatchCookieConsentUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("cookie-consent-updated"));
}

/** Analytics scripts may load only when decided + analytics === true. */
export function isAnalyticsConsentGranted(consent: StoredCookieConsent | null): boolean {
  return consent?.analytics === true;
}

/**
 * Clear known first-party GA/Clarity cookies (path=/).
 * Third-party cookies cannot be deleted from first-party JS — document that limit at call sites.
 */
export function clearFirstPartyAnalyticsCookies(
  cookieString: string,
  hostname: string
): string[] {
  const names = cookieString
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean)
    .filter(isFirstPartyAnalyticsCookieName);
  if (typeof document === "undefined") return names;

  const domains = Array.from(
    new Set([undefined, hostname, hostname.startsWith(".") ? hostname : `.${hostname}`])
  );
  for (const name of names) {
    for (const domain of domains) {
      const domainPart = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; path=/${domainPart}`;
    }
  }
  return names;
}
