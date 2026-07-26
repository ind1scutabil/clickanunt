import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_PREFERENCE_PATHS,
  isAnalyticsConsentGranted,
  isCookiePreferencePath,
  isFirstPartyAnalyticsCookieName,
  parseStoredCookieConsent,
  serializeCookieConsent,
} from "@/lib/cookie-consent";

describe("cookie consent storage", () => {
  it("starts undecided: null raw → no analytics", () => {
    expect(parseStoredCookieConsent(null)).toBeNull();
    expect(isAnalyticsConsentGranted(null)).toBe(false);
  });

  it("accept analytics persists and grants", () => {
    const raw = serializeCookieConsent({
      analytics: true,
      marketing: false,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    const parsed = parseStoredCookieConsent(raw);
    expect(parsed).toEqual({
      v: 1,
      necessary: true,
      analytics: true,
      marketing: false,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(isAnalyticsConsentGranted(parsed)).toBe(true);
    expect(COOKIE_CONSENT_STORAGE_KEY).toBe("clickanunt_cookie_consent_v1");
  });

  it("refuse analytics persists and denies", () => {
    const raw = serializeCookieConsent({
      analytics: false,
      marketing: false,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    const parsed = parseStoredCookieConsent(raw);
    expect(parsed?.analytics).toBe(false);
    expect(isAnalyticsConsentGranted(parsed)).toBe(false);
  });

  it("withdrawal (analytics false after true) denies", () => {
    const accepted = parseStoredCookieConsent(
      serializeCookieConsent({ analytics: true, marketing: false })
    );
    expect(isAnalyticsConsentGranted(accepted)).toBe(true);
    const withdrawn = parseStoredCookieConsent(
      serializeCookieConsent({ analytics: false, marketing: false })
    );
    expect(isAnalyticsConsentGranted(withdrawn)).toBe(false);
  });

  it("rejects malformed, wrong version, or non-boolean flags", () => {
    expect(parseStoredCookieConsent("{}")).toBeNull();
    expect(parseStoredCookieConsent('{"v":2,"necessary":true,"analytics":true}')).toBeNull();
    expect(parseStoredCookieConsent("not-json")).toBeNull();
    expect(
      parseStoredCookieConsent('{"v":1,"necessary":true,"analytics":"yes","marketing":false}')
    ).toBeNull();
    expect(
      parseStoredCookieConsent('{"v":1,"necessary":true,"analytics":1,"marketing":0}')
    ).toBeNull();
    expect(parseStoredCookieConsent('{"v":1,"necessary":true}')).toBeNull();
  });

  it("identifies first-party analytics cookie names only", () => {
    expect(isFirstPartyAnalyticsCookieName("_ga")).toBe(true);
    expect(isFirstPartyAnalyticsCookieName("_ga_C0F3DZEDPG")).toBe(true);
    expect(isFirstPartyAnalyticsCookieName("_clck")).toBe(true);
    expect(isFirstPartyAnalyticsCookieName("_clsk")).toBe(true);
    expect(isFirstPartyAnalyticsCookieName("csrf-token")).toBe(false);
    expect(isFirstPartyAnalyticsCookieName("accessToken")).toBe(false);
  });

  it("exposes a safe preference path", () => {
    expect(COOKIE_PREFERENCE_PATHS).toContain("/cookies");
    expect(isCookiePreferencePath("/cookies")).toBe(true);
    expect(isCookiePreferencePath("/cookies/")).toBe(true);
    expect(isCookiePreferencePath("/cookies?x=1")).toBe(true);
    expect(isCookiePreferencePath("/evil")).toBe(false);
    expect(isCookiePreferencePath("/")).toBe(false);
  });
});
