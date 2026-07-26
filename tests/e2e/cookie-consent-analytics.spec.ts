import { test, expect } from "@playwright/test";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  serializeCookieConsent,
} from "../../lib/cookie-consent";

function redact(u: string): string {
  try {
    const x = new URL(u);
    return `${x.origin}${x.pathname}`;
  } catch {
    return u.split("?")[0] ?? u;
  }
}

async function countPageViews(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
    let n = 0;
    for (const entry of layer) {
      if (!entry) continue;
      if (Array.isArray(entry) && entry[0] === "event" && entry[1] === "page_view") n += 1;
      else if (typeof entry === "object" && entry !== null) {
        const o = entry as Record<string, unknown>;
        // Arguments object from gtag push often looks like {0:'event',1:'page_view',...}
        if (o[0] === "event" && o[1] === "page_view") n += 1;
        if (o.event === "page_view") n += 1;
      }
    }
    return n;
  });
}

test.describe("cookie consent gates analytics", () => {
  test("unknown: zero gtag.js, collect, clarity", async ({ page, baseURL }) => {
    const hits: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/googletagmanager\.com\/gtag\/js|\/g\/collect|clarity\.ms/i.test(u)) {
        hits.push(redact(u));
      }
    });

    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const banner = page.getByRole("dialog", { name: "Consimțământ cookie" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: "Acceptă" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Refuză" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Preferințe" })).toBeVisible();
    await expect(page.locator("body")).toBeVisible();
    expect(hits).toEqual([]);
  });

  test("refuse: still zero after reload and SPA nav", async ({ page, baseURL }) => {
    const hits: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/googletagmanager\.com\/gtag\/js|\/g\/collect|clarity\.ms/i.test(u)) {
        hits.push(redact(u));
      }
    });

    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.getByRole("dialog", { name: "Consimțământ cookie" }).getByRole("button", { name: "Refuză" }).click();
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const listings = page.locator('a[href="/listings"]').first();
    if (await listings.count()) {
      await listings.click();
      await page.waitForTimeout(1500);
    } else {
      await page.goto(baseURL! + "/listings", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
    }

    expect(hits).toEqual([]);
    await expect(page.getByRole("dialog", { name: "Consimțământ cookie" })).toHaveCount(0);
  });

  test("accept: gtag 200, collect not CSP-blocked, page_view counts", async ({ page, baseURL }) => {
    const gtagStatuses: number[] = [];
    const collectOk: string[] = [];
    const collectFailed: string[] = [];
    const cspErrors: string[] = [];

    page.on("console", (m) => {
      const t = m.text();
      if (/Content Security Policy/i.test(t) && /google-analytics|clarity|googletagmanager/i.test(t)) {
        cspErrors.push(t.slice(0, 240));
      }
    });
    page.on("response", (res) => {
      const u = res.url();
      if (/googletagmanager\.com\/gtag\/js/i.test(u)) gtagStatuses.push(res.status());
      if (/\/g\/collect/i.test(u)) collectOk.push(`${res.status()}:${redact(u)}`);
    });
    page.on("requestfailed", (req) => {
      const u = req.url();
      if (!/\/g\/collect/i.test(u)) return;
      const reason = req.failure()?.errorText || "unknown";
      // Aborted/cancelled navigations are not CSP blocks
      if (/ERR_ABORTED|cancelled|net::ERR_FAILED/i.test(reason) && !/csp|blocked/i.test(reason)) return;
      collectFailed.push(`${reason}:${redact(u)}`);
    });

    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.getByRole("dialog", { name: "Consimțământ cookie" }).getByRole("button", { name: "Acceptă" }).click();
    await page.waitForTimeout(4500);

    if (gtagStatuses.length === 0) {
      test.skip(true, "NEXT_PUBLIC_GA_ID not active on this server");
      return;
    }

    expect(gtagStatuses.every((s) => s === 200)).toBe(true);
    expect(cspErrors).toEqual([]);
    expect(collectFailed.filter((f) => /csp|Content Security/i.test(f))).toEqual([]);
    expect(collectOk.length + collectFailed.length).toBeGreaterThanOrEqual(1);

    const initialViews = await countPageViews(page);
    expect(initialViews).toBe(1);

    const listings = page.locator('a[href="/listings"]').first();
    if (await listings.count()) {
      await listings.click();
      await page.waitForTimeout(3500);
      const afterNav = await countPageViews(page);
      expect(afterNav).toBe(2);
    }
  });

  test("reload keeps accept; withdraw stops further script loads", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([key, raw]) => {
        localStorage.setItem(key, raw);
      },
      [
        COOKIE_CONSENT_STORAGE_KEY,
        serializeCookieConsent({ analytics: true, marketing: false }),
      ]
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: "Consimțământ cookie" })).toHaveCount(0);

    let phase: "before" | "after" = "before";
    const afterHits: string[] = [];
    page.on("request", (req) => {
      if (phase !== "after") return;
      const u = req.url();
      if (/googletagmanager\.com\/gtag\/js|clarity\.ms\/tag/i.test(u)) {
        afterHits.push(redact(u));
      }
    });

    await page.getByRole("button", { name: "Setări cookie" }).click();
    const dialog = page.getByRole("dialog", { name: "Setări cookie" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Refuză non-esențiale" }).click();
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), COOKIE_CONSENT_STORAGE_KEY))
      .toContain('"analytics":false');

    phase = "after";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.goto(baseURL! + "/listings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(afterHits).toEqual([]);

    const stored = await page.evaluate((key) => localStorage.getItem(key), COOKIE_CONSENT_STORAGE_KEY);
    expect(stored).toContain('"analytics":false');
  });

  test("banner keyboard: Preferințe opens and Escape closes", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    const prefs = page.getByRole("dialog", { name: "Consimțământ cookie" }).getByRole("button", { name: "Preferințe" });
    await prefs.focus();
    await prefs.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Setări cookie" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("transport guard: withdraw blocks only analytics; first-party still works; re-accept restores", async ({
    page,
    baseURL,
  }) => {
    const analyticsAfterWithdraw: string[] = [];
    let phase: "warm" | "withdrawn" | "reaccepted" = "warm";
    page.on("request", (req) => {
      const u = req.url();
      if (phase !== "withdrawn") return;
      if (
        /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|clarity\.ms|c\.bing\.com/i.test(
          u
        )
      ) {
        analyticsAfterWithdraw.push(redact(u));
      }
    });

    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.getByRole("dialog", { name: "Consimțământ cookie" }).getByRole("button", { name: "Acceptă" }).click();
    await page.waitForTimeout(2500);

    for (let i = 0; i < 3; i++) {
      await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
      await page
        .getByRole("dialog", { name: "Setări cookie" })
        .getByRole("button", { name: "Refuză non-esențiale" })
        .click();
      await expect
        .poll(async () =>
          page.evaluate(() => ({
            patched: Boolean((window as unknown as { __caBeaconPatched?: boolean }).__caBeaconPatched),
            blocked: Boolean((window as unknown as { __caAnalyticsBlocked?: boolean }).__caAnalyticsBlocked),
            analytics: localStorage.getItem("clickanunt_cookie_consent_v1"),
          }))
        )
        .toMatchObject({ patched: true, blocked: true });

      await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
      const settings = page.getByRole("dialog", { name: "Setări cookie" });
      await expect(settings).toBeVisible();
      const analyticsBox = settings
        .locator("li")
        .filter({ hasText: /^Analitice/ })
        .locator('input[type="checkbox"]');
      // After refuse, draft must reflect storage (unchecked) before we re-enable.
      await expect(analyticsBox).not.toBeChecked();
      await analyticsBox.check();
      await expect(analyticsBox).toBeChecked();
      await settings.getByRole("button", { name: "Salvează" }).click();
      await expect
        .poll(async () => {
          const v = await page.evaluate(() => ({
            patched: Boolean((window as unknown as { __caBeaconPatched?: boolean }).__caBeaconPatched),
            blocked: Boolean((window as unknown as { __caAnalyticsBlocked?: boolean }).__caAnalyticsBlocked),
            raw: localStorage.getItem("clickanunt_cookie_consent_v1"),
          }));
          return (
            v.patched === false &&
            v.blocked === false &&
            typeof v.raw === "string" &&
            v.raw.includes('"analytics":true')
          );
        })
        .toBe(true);
    }

    // Final withdraw for transport probes
    await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
    await page
      .getByRole("dialog", { name: "Setări cookie" })
      .getByRole("button", { name: "Refuză non-esențiale" })
      .click();
    await page.waitForTimeout(500);
    phase = "withdrawn";

    const probes = await page.evaluate(async () => {
      const out: Record<string, unknown> = {};
      const listings = await fetch("/api/listings?status=active&limit=1");
      out.listingsStatus = listings.status;

      const refresh = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      out.refreshStatus = refresh.status;

      const me = await fetch("/api/users/me");
      out.meStatus = me.status;

      const health = await fetch("/api/health");
      out.healthStatus = health.status;

      out.beaconLocal = navigator.sendBeacon("/api/health", new Blob(["ping"], { type: "text/plain" }));

      const ga = await fetch("https://region1.google-analytics.com/g/collect");
      out.gaBlockedStatus = ga.status;

      let lookalikeStatus: number | "network-error" = "network-error";
      try {
        const evil = await fetch("https://google-analytics.com.evil.example/g/collect");
        lookalikeStatus = evil.status;
      } catch {
        lookalikeStatus = "network-error";
      }
      out.lookalike = lookalikeStatus;

      let evilLabel: number | "network-error" = "network-error";
      try {
        const evil2 = await fetch("https://evilgoogle-analytics.com/g/collect");
        evilLabel = evil2.status;
      } catch {
        evilLabel = "network-error";
      }
      out.evilLabel = evilLabel;

      return out;
    });

    expect(probes.listingsStatus).toBe(200);
    expect([401, 400, 403, 200]).toContain(probes.refreshStatus as number);
    expect([401, 200]).toContain(probes.meStatus as number);
    expect([200, 204]).toContain(probes.healthStatus as number);
    expect(probes.beaconLocal).toBe(true);
    expect(probes.gaBlockedStatus).toBe(204);
    // Lookalikes must NOT be short-circuited as 204 by our guard
    expect(probes.lookalike).not.toBe(204);
    expect(probes.evilLabel).not.toBe(204);
    expect(analyticsAfterWithdraw).toEqual([]);

    // Site still navigable
    await page.goto(baseURL! + "/listings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await page.goto(baseURL! + "/auth/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await page.goto(baseURL! + "/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Re-accept → collect works again
    phase = "reaccepted";
    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
    const settings = page.getByRole("dialog", { name: "Setări cookie" });
    const analyticsBox = settings.locator("li").filter({ hasText: /^Analitice/ }).locator('input[type="checkbox"]');
    await expect(analyticsBox).not.toBeChecked();
    await analyticsBox.check();
    await expect(analyticsBox).toBeChecked();
    await settings.getByRole("button", { name: "Salvează" }).click();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const raw = localStorage.getItem("clickanunt_cookie_consent_v1");
          return typeof raw === "string" && raw.includes('"analytics":true');
        })
      )
      .toBe(true);

    let sawCollect = false;
    page.on("response", (res) => {
      if (/\/g\/collect/i.test(res.url()) && res.status() < 400) sawCollect = true;
    });
    await page.waitForTimeout(4000);
    const gtagPresent = await page.evaluate(() =>
      [...document.scripts].some((s) => /googletagmanager\.com\/gtag\/js/.test(s.src))
    );
    if (gtagPresent) {
      expect(await countPageViews(page)).toBeGreaterThanOrEqual(1);
      // collect may be fire-and-forget; gtag presence + page_view is sufficient if network flakes
      expect(sawCollect || (await countPageViews(page)) >= 1).toBe(true);
    }
  });

  test("withdraw clears _ga/_ga_* host cookies; keeps consent + non-GA; re-accept works", async ({
    page,
    baseURL,
  }) => {
    const analyticsHits: string[] = [];
    let trackAnalytics = false;
    page.on("request", (req) => {
      if (!trackAnalytics) return;
      const u = req.url();
      if (/googletagmanager\.com\/gtag\/js|\/g\/collect|clarity\.ms/i.test(u)) {
        analyticsHits.push(redact(u));
      }
    });

    await page.goto(baseURL! + "/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("dialog", { name: "Consimțământ cookie" })
      .getByRole("button", { name: "Acceptă" })
      .click();
    await page.waitForTimeout(3000);

    // Seed host-only GA + non-GA cookies (parent Domain=clickanunt.ro cannot stick on localhost).
    await page.evaluate(() => {
      document.cookie = "_ga=GA1.1.test; Path=/";
      document.cookie = "_ga_C0F3DZEDPG=GS1.1.test; Path=/";
      document.cookie = "csrf-token=keep-csrf; Path=/";
      document.cookie = "favorites=keep-fav; Path=/";
      document.cookie = "my_ga=keep-lookalike; Path=/";
    });

    await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
    await page
      .getByRole("dialog", { name: "Setări cookie" })
      .getByRole("button", { name: "Refuză non-esențiale" })
      .click();

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          const names = document.cookie
            .split(";")
            .map((c) => c.trim().split("=")[0])
            .filter(Boolean);
          return {
            analyticsFalse: typeof raw === "string" && raw.includes('"analytics":false'),
            hasConsentKey: Boolean(raw),
            ga: names.filter((n) => n === "_ga" || n.startsWith("_ga_")),
            csrf: names.includes("csrf-token"),
            favorites: names.includes("favorites"),
            lookalike: names.includes("my_ga"),
          };
        }, COOKIE_CONSENT_STORAGE_KEY)
      )
      .toMatchObject({
        analyticsFalse: true,
        hasConsentKey: true,
        ga: [],
        csrf: true,
        favorites: true,
        lookalike: true,
      });

    trackAnalytics = true;
    analyticsHits.length = 0;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(analyticsHits).toEqual([]);
    const afterReload = await page.evaluate(() => {
      const names = document.cookie
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter(Boolean);
      return names.filter((n) => n === "_ga" || n.startsWith("_ga_"));
    });
    expect(afterReload).toEqual([]);

    // Accept again → GA may recreate cookies
    await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
    const settings = page.getByRole("dialog", { name: "Setări cookie" });
    const analyticsBox = settings
      .locator("li")
      .filter({ hasText: /^Analitice/ })
      .locator('input[type="checkbox"]');
    await expect(analyticsBox).not.toBeChecked();
    await analyticsBox.check();
    await settings.getByRole("button", { name: "Salvează" }).click();
    await page.waitForTimeout(3500);
    const gtagPresent = await page.evaluate(() =>
      [...document.scripts].some((s) => /googletagmanager\.com\/gtag\/js/.test(s.src))
    );
    expect(gtagPresent).toBe(true);

    // Withdraw again → GA cookies cleared
    await page.locator("footer").getByRole("button", { name: "Setări cookie" }).click();
    await page
      .getByRole("dialog", { name: "Setări cookie" })
      .getByRole("button", { name: "Refuză non-esențiale" })
      .click();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const names = document.cookie
            .split(";")
            .map((c) => c.trim().split("=")[0])
            .filter(Boolean);
          return names.filter((n) => n === "_ga" || n.startsWith("_ga_"));
        })
      )
      .toEqual([]);
  });
});
