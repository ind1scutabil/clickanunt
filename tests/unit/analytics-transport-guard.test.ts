import {
  hostnameMatchesDomain,
  installAnalyticsTransportGuard,
  isAnalyticsTransportUrl,
  setAnalyticsTransportBlocked,
  uninstallAnalyticsTransportGuard,
  type AnalyticsTransportWindow,
} from "@/lib/analytics-transport-guard";

describe("analytics transport URL hostname matching", () => {
  it("matches real GA / GTM / Clarity hosts and subdomains", () => {
    expect(isAnalyticsTransportUrl("https://www.google-analytics.com/g/collect")).toBe(true);
    expect(isAnalyticsTransportUrl("https://region1.google-analytics.com/g/collect")).toBe(true);
    expect(isAnalyticsTransportUrl("https://analytics.google.com/g/collect")).toBe(true);
    expect(isAnalyticsTransportUrl("https://www.googletagmanager.com/gtag/js?id=G-X")).toBe(true);
    expect(isAnalyticsTransportUrl("https://www.clarity.ms/tag/abc")).toBe(true);
    expect(isAnalyticsTransportUrl("https://a.clarity.ms/collect")).toBe(true);
    expect(isAnalyticsTransportUrl("https://c.bing.com/c.gif")).toBe(true);
  });

  it("rejects lookalike / suffix-of-label hosts", () => {
    expect(isAnalyticsTransportUrl("https://google-analytics.com.evil.example/g/collect")).toBe(
      false
    );
    expect(isAnalyticsTransportUrl("https://evilgoogle-analytics.com/g/collect")).toBe(false);
    expect(isAnalyticsTransportUrl("https://not-clarity.ms.attacker.test/x")).toBe(false);
    expect(isAnalyticsTransportUrl("https://c.bing.com.evil.example/x")).toBe(false);
    expect(isAnalyticsTransportUrl("https://evilc.bing.com/x")).toBe(false);
    expect(isAnalyticsTransportUrl("https://www.clickanunt.ro/api/listings")).toBe(false);
    expect(isAnalyticsTransportUrl("/api/listings")).toBe(false);
    expect(isAnalyticsTransportUrl("https://api.stripe.com/v1/payment_intents")).toBe(false);
  });

  it("hostnameMatchesDomain requires a dot boundary", () => {
    expect(hostnameMatchesDomain("region1.google-analytics.com", "google-analytics.com")).toBe(
      true
    );
    expect(hostnameMatchesDomain("evilgoogle-analytics.com", "google-analytics.com")).toBe(false);
    expect(hostnameMatchesDomain("google-analytics.com.evil.example", "google-analytics.com")).toBe(
      false
    );
  });
});

describe("analytics transport guard install/uninstall", () => {
  type FakeNav = { sendBeacon: jest.Mock };
  type FakeWin = AnalyticsTransportWindow & {
    navigator: FakeNav;
    fetch: jest.Mock;
  };

  function makeWin(): FakeWin {
    const sendBeacon = jest.fn(() => true);
    const fetch = jest.fn(async () => ({ ok: true, status: 200, statusText: "OK" }));
    return {
      navigator: { sendBeacon },
      fetch,
    } as unknown as FakeWin;
  }

  it("blocks only analytics URLs while blocked, allows first-party", async () => {
    const w = makeWin();
    const origBeacon = w.navigator.sendBeacon;
    const origFetch = w.fetch;

    setAnalyticsTransportBlocked(w as unknown as AnalyticsTransportWindow & Window, true);
    expect(w.__caBeaconPatched).toBe(true);
    expect(w.navigator.sendBeacon).not.toBe(origBeacon);

    expect(w.navigator.sendBeacon("https://region1.google-analytics.com/g/collect")).toBe(false);
    expect(origBeacon).not.toHaveBeenCalled();

    expect(w.navigator.sendBeacon("/api/client-beacon-test")).toBe(true);
    expect(origBeacon).toHaveBeenCalledTimes(1);

    const blocked = await w.fetch("https://www.google-analytics.com/g/collect");
    expect(blocked.status).toBe(204);
    expect(origFetch).not.toHaveBeenCalled();

    const ok = await w.fetch("/api/listings");
    expect(ok.status).toBe(200);
    expect(origFetch).toHaveBeenCalledTimes(1);

    // Reject lookalikes (must reach original)
    await w.fetch("https://google-analytics.com.evil.example/g/collect");
    expect(origFetch).toHaveBeenCalledTimes(2);
  });

  it("does not stack wrappers across repeated block/unblock cycles", () => {
    const w = makeWin();
    const nativeBeacon = w.navigator.sendBeacon;
    const nativeFetch = w.fetch;

    for (let i = 0; i < 3; i++) {
      setAnalyticsTransportBlocked(w as unknown as AnalyticsTransportWindow & Window, true);
      setAnalyticsTransportBlocked(w as unknown as AnalyticsTransportWindow & Window, false);
    }

    expect(w.__caBeaconPatched).toBe(false);
    expect(w.navigator.sendBeacon).toBe(nativeBeacon);
    expect(w.fetch).toBe(nativeFetch);

    installAnalyticsTransportGuard(w as unknown as AnalyticsTransportWindow & Window);
    installAnalyticsTransportGuard(w as unknown as AnalyticsTransportWindow & Window);
    expect(w.__caBeaconPatched).toBe(true);
    const midBeacon = w.navigator.sendBeacon;
    installAnalyticsTransportGuard(w as unknown as AnalyticsTransportWindow & Window);
    expect(w.navigator.sendBeacon).toBe(midBeacon);

    uninstallAnalyticsTransportGuard(w as unknown as AnalyticsTransportWindow & Window);
    expect(w.navigator.sendBeacon).toBe(nativeBeacon);
    expect(w.fetch).toBe(nativeFetch);
  });
});
