import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_PREFERENCE_PATHS,
  clearFirstPartyAnalyticsCookies,
  gaCookieClearDomainAttributes,
  isAnalyticsConsentGranted,
  isClickAnuntSiteHostname,
  isCookiePreferencePath,
  isFirstPartyAnalyticsCookieName,
  isGaAnalyticsCookieName,
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

  it("identifies GA cookie names strictly (_ga / _ga_* only for GA clear)", () => {
    expect(isGaAnalyticsCookieName("_ga")).toBe(true);
    expect(isGaAnalyticsCookieName("_ga_C0F3DZEDPG")).toBe(true);
    expect(isGaAnalyticsCookieName("ga")).toBe(false);
    expect(isGaAnalyticsCookieName("my_ga")).toBe(false);
    expect(isGaAnalyticsCookieName("analytics_ga_id")).toBe(false);
    expect(isGaAnalyticsCookieName("_gat")).toBe(false);
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

describe("GA parent-domain cookie cleanup", () => {
  it("recognizes only ClickAnunț site hostnames", () => {
    expect(isClickAnuntSiteHostname("clickanunt.ro")).toBe(true);
    expect(isClickAnuntSiteHostname("www.clickanunt.ro")).toBe(true);
    expect(isClickAnuntSiteHostname("cdn.clickanunt.ro")).toBe(true);
    expect(isClickAnuntSiteHostname("localhost")).toBe(false);
    expect(isClickAnuntSiteHostname("127.0.0.1")).toBe(false);
    expect(isClickAnuntSiteHostname("clickanunt.ro.evil.example")).toBe(false);
    expect(isClickAnuntSiteHostname("evilclickanunt.ro")).toBe(false);
    expect(isClickAnuntSiteHostname("example.com")).toBe(false);
  });

  it("www / apex get host-only + parent Domain attributes", () => {
    expect(gaCookieClearDomainAttributes("www.clickanunt.ro")).toEqual([
      undefined,
      "clickanunt.ro",
      ".clickanunt.ro",
    ]);
    expect(gaCookieClearDomainAttributes("clickanunt.ro")).toEqual([
      undefined,
      "clickanunt.ro",
      ".clickanunt.ro",
    ]);
  });

  it("localhost and lookalikes never use Domain=clickanunt.ro", () => {
    expect(gaCookieClearDomainAttributes("localhost")).toEqual([undefined]);
    expect(gaCookieClearDomainAttributes("127.0.0.1")).toEqual([undefined]);
    expect(gaCookieClearDomainAttributes("clickanunt.ro.evil.example")).toEqual([undefined]);
    expect(gaCookieClearDomainAttributes("evilclickanunt.ro")).toEqual([undefined]);
  });

  it("clearFirstPartyAnalyticsCookies expires only _ga/_ga_* with Path=/ and correct Domains", () => {
    const writes: string[] = [];
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        return [
          "_ga=GA1.1.1",
          "_ga_C0F3DZEDPG=GS1.1",
          "csrf-token=keep",
          "session=keep",
          "favorites=keep",
          "my_ga=keep",
          "_clck=clarity-keep",
        ].join("; ");
      },
      set(v: string) {
        writes.push(v);
      },
    });

    try {
      const cleared = clearFirstPartyAnalyticsCookies(document.cookie, "www.clickanunt.ro");
      expect(cleared.sort()).toEqual(["_ga", "_ga_C0F3DZEDPG"].sort());
      expect(writes.some((w) => w.includes("csrf-token"))).toBe(false);
      expect(writes.some((w) => w.includes("session"))).toBe(false);
      expect(writes.some((w) => w.includes("favorites"))).toBe(false);
      expect(writes.some((w) => w.includes("my_ga"))).toBe(false);
      expect(writes.some((w) => w.includes("_clck"))).toBe(false);

      const gaWrites = writes.filter((w) => w.startsWith("_ga=") || w.startsWith("_ga_"));
      expect(gaWrites.length).toBe(6); // 2 names × 3 domain variants
      for (const w of gaWrites) {
        expect(w).toMatch(/Max-Age=0/);
        expect(w).toMatch(/Path=\//);
      }
      expect(
        gaWrites.some((w) => w.includes("Domain=clickanunt.ro") && !w.includes("Domain=.clickanunt.ro"))
      ).toBe(true);
      expect(gaWrites.some((w) => w.includes("Domain=.clickanunt.ro"))).toBe(true);
      expect(gaWrites.some((w) => !/Domain=/.test(w))).toBe(true);
    } finally {
      if (original) Object.defineProperty(document, "cookie", original);
      else delete (document as { cookie?: string }).cookie;
    }
  });

  it("clear on localhost never writes Domain=clickanunt.ro", () => {
    const writes: string[] = [];
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        return "_ga=GA1.1.1; csrf-token=keep";
      },
      set(v: string) {
        writes.push(v);
      },
    });
    try {
      clearFirstPartyAnalyticsCookies(document.cookie, "localhost");
      expect(writes.every((w) => !/Domain=clickanunt\.ro/i.test(w))).toBe(true);
      expect(writes).toEqual(["_ga=; Max-Age=0; Path=/"]);
    } finally {
      if (original) Object.defineProperty(document, "cookie", original);
    }
  });

  it("clear on lookalike hostname never writes Domain=clickanunt.ro", () => {
    const writes: string[] = [];
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        return "_ga=GA1.1.1";
      },
      set(v: string) {
        writes.push(v);
      },
    });
    try {
      clearFirstPartyAnalyticsCookies(document.cookie, "clickanunt.ro.evil.example");
      expect(writes.every((w) => !/Domain=clickanunt\.ro/i.test(w))).toBe(true);
      expect(writes).toEqual(["_ga=; Max-Age=0; Path=/"]);
    } finally {
      if (original) Object.defineProperty(document, "cookie", original);
    }
  });
});
