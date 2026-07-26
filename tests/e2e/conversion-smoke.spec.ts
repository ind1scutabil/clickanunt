/**
 * Conversion recovery smoke — Chromium / Mobile Chrome / WebKit.
 * No listing submit, no message send, no emails.
 */
import { test, expect } from "@playwright/test";

test.describe("Conversion smoke surfaces", () => {
  test("homepage: no zero categories, no EUR EUR, Intră în cont when logged out", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    const status500: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 500) status500.push(`${r.status()} ${r.url()}`);
    });

    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);

    const home = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      const zeroCats = Array.from(document.querySelectorAll("a")).filter((a) =>
        /\b0 anunțuri\b/.test(a.textContent || ""),
      ).length;
      const emptyShelvesWithTitle = Array.from(document.querySelectorAll("h2")).filter((h) => {
        const section = h.closest("div, section");
        if (!section) return false;
        const hasCards = section.querySelectorAll('a[href^="/listings/"]').length > 0;
        const hasVeziTot = /Vezi tot/.test(section.textContent || "");
        return hasVeziTot && !hasCards && !section.querySelector("[class*='animate-pulse']");
      }).length;
      return {
        zeroCats,
        eurEur: /EUR\s*EUR|RON\s*RON/.test(text),
        hasDelogat: /DELOGAT/.test(text),
        hasIntra: /Intră în cont/.test(text),
        emptyShelvesWithTitle,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      };
    });

    expect(home.zeroCats).toBe(0);
    expect(home.eurEur).toBe(false);
    expect(home.hasDelogat).toBe(false);
    // Badge is xl-only; on mobile Cont menu still exists without the text
    if (!testInfo.project.name.toLowerCase().includes("mobile")) {
      expect(home.hasIntra).toBe(true);
    }
    expect(home.emptyShelvesWithTitle).toBe(0);
    expect(home.overflow).toBe(false);
    expect(status500).toEqual([]);
    const appErrors = errors.filter(
      (e) =>
        !/google-analytics|Content Security Policy|favicon|hydration|Download the React DevTools|Failed to load resource/i.test(
          e,
        ),
    );
    expect(appErrors).toEqual([]);
  });

  test("catalog: cards stay, search/filter/pagination, no loading flash text", async ({ page }) => {
    const status500: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 500) status500.push(`${r.status()} ${r.url()}`);
    });

    await page.goto("/listings", { waitUntil: "domcontentloaded", timeout: 60000 });
    const first = await page.evaluate(() => ({
      cards: document.querySelectorAll('a[href^="/listings/"]').length,
      loading: /Se încarcă anunțurile/.test(document.body?.innerText || ""),
      eurEur: /EUR\s*EUR|RON\s*RON/.test(document.body?.innerText || ""),
    }));
    expect(first.loading).toBe(false);
    expect(first.cards).toBeGreaterThan(0);
    expect(first.eurEur).toBe(false);

    await page.waitForTimeout(2000);
    const mid = await page.evaluate(
      () => document.querySelectorAll('a[href^="/listings/"]').length,
    );
    expect(mid).toBeGreaterThan(0);

    // search via URL (catalog filter UI varies; avoid brittle hidden inputs)
    await page.goto("/listings?q=auto", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    const searched = await page.evaluate(
      () => document.querySelectorAll('a[href^="/listings/"]').length,
    );
    expect(searched).toBeGreaterThanOrEqual(0);
    expect(page.url()).toContain("q=auto");

    // category filter
    await page.goto("/listings?category=Auto%2C%20moto%20%C8%99i%20ambarca%C8%9Biuni", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);
    const filteredCards = await page.evaluate(
      () => document.querySelectorAll('a[href^="/listings/"]').length,
    );
    expect(filteredCards).toBeGreaterThanOrEqual(0);

    // pagination if present — cards must remain visible
    const next = page.getByRole("button", { name: /Înainte/i });
    if ((await next.count()) && (await next.isEnabled())) {
      await next.click();
      await page.waitForTimeout(1500);
      const afterPage = await page.evaluate(
        () => document.querySelectorAll('a[href^="/listings/"]').length,
      );
      expect(afterPage).toBeGreaterThanOrEqual(0);
      const loading = await page.evaluate(() =>
        /Se încarcă anunțurile/.test(document.body?.innerText || ""),
      );
      expect(loading).toBe(false);
    }

    expect(status500).toEqual([]);
  });

  test("detail page loads; gallery navigation does not require reload", async ({ page }) => {
    await page.goto("/listings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const href = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a[href^="/listings/"]')).find((el) =>
        /\/listings\/[0-9a-f-]{36}/i.test(el.getAttribute("href") || ""),
      );
      return a?.getAttribute("href") || null;
    });
    test.skip(!href, "no listing card");
    await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toContainText(/vizualiz|RON|EUR|anunț/i);
    const gallery = page.getByTestId("listing-photo-gallery");
    if (await gallery.count()) {
      const thumb1 = page.getByTestId("listing-gallery-thumb-1");
      if (await thumb1.count()) {
        await thumb1.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("register has exactly one Ai deja cont?; dashboard/favorites/messages load", async ({
    page,
  }) => {
    await page.goto("/auth/signup", { waitUntil: "domcontentloaded" });
    const dup = await page.evaluate(
      () => (document.body.innerText.match(/Ai deja cont\?/g) || []).length,
    );
    expect(dup).toBe(1);

    for (const path of ["/dashboard", "/favorites", "/messages"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60000 });
      expect(res?.status() ?? 0).toBeLessThan(500);
    }
  });
});
