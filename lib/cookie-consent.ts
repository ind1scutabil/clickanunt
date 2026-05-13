export const COOKIE_CONSENT_STORAGE_KEY = "clickanunt_cookie_consent_v1";

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
    return {
      v: 1,
      necessary: true,
      analytics: Boolean(o.analytics),
      marketing: Boolean(o.marketing),
      decidedAt: typeof o.decidedAt === "string" ? o.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(c: Omit<StoredCookieConsent, "v" | "necessary"> & Partial<Pick<StoredCookieConsent, "decidedAt">>): string {
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
