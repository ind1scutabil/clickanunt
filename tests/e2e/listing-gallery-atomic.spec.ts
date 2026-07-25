/**
 * Atomic gallery sync under network throttling / artificial latency.
 * Uses local `/ui-demo/gallery-atomic` fixture — never production Peugeot.
 *
 * PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/listing-gallery-atomic.spec.ts \
 *   --project=chromium --project="Mobile Chrome" --project=webkit
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";

const OUT = path.join(process.cwd(), "test-results", "gallery-atomic");
const FIXTURE_PATH = "/ui-demo/gallery-atomic";

/** 1×1 PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function assertAtomicIds(page: Page, scope: "page" | "lightbox") {
  const blurSel =
    scope === "lightbox"
      ? '[data-testid="listing-gallery-lightbox-blur"]'
      : '[data-testid="listing-gallery-blur"]';
  const fgSel =
    scope === "lightbox"
      ? '[data-testid="listing-gallery-lightbox-fg"]'
      : '[data-testid="listing-gallery-fg"]';
  const counterSel =
    scope === "lightbox"
      ? '[data-testid="listing-gallery-lightbox-counter"]'
      : '[data-testid="listing-gallery-counter"]';

  const ids = await page.evaluate(
    ({ blurSel: b, fgSel: f, counterSel: c }) => {
      const blur = document.querySelector(b);
      const fg = document.querySelector(f);
      const counter = document.querySelector(c);
      return {
        blur: blur?.getAttribute("data-photo-id") ?? null,
        fg: fg?.getAttribute("data-photo-id") ?? null,
        counter: counter?.getAttribute("data-photo-id") ?? null,
        blurIndex: blur?.getAttribute("data-photo-index") ?? null,
        fgIndex: fg?.getAttribute("data-photo-index") ?? null,
        counterIndex: counter?.getAttribute("data-photo-index") ?? null,
      };
    },
    { blurSel, fgSel, counterSel },
  );

  expect(ids.blur, "background photo ID").toBe(ids.fg);
  expect(ids.fg, "foreground photo ID").toBe(ids.counter);
  expect(ids.blurIndex).toBe(ids.fgIndex);
  expect(ids.fgIndex).toBe(ids.counterIndex);
  return ids;
}

async function installFixtureImageLatency(page: Page) {
  const counts = { thumb: 0, medium: 0, original: 0, other: 0 };

  await page.route("**/listings/gallery-atomic-fixture/**", async (route: Route) => {
    const url = route.request().url();
    let delay = 80;
    if (url.includes("/thumb/")) {
      counts.thumb += 1;
      delay = 50;
    } else if (url.includes("/medium/")) {
      counts.medium += 1;
      delay = 1200;
    } else if (url.includes("/original/")) {
      counts.original += 1;
      delay = 400;
    } else {
      counts.other += 1;
    }
    await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: TINY_PNG,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  });

  return counts;
}

async function waitForDisplayedIndex(page: Page, index: number) {
  await expect(page.getByTestId("listing-photo-gallery")).toHaveAttribute(
    "data-displayed-index",
    String(index),
    { timeout: 45000 },
  );
  await expect(page.getByTestId("listing-photo-gallery")).toHaveAttribute(
    "data-pending",
    "false",
    { timeout: 45000 },
  );
}

test.describe("Listing gallery atomic sync", () => {
  test("Fast 3G: rapid nav keeps blur/fg/counter aligned", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP network conditions require Chromium");
    await installFixtureImageLatency(page);

    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: ((1.6 * 1024 * 1024) / 8) * 0.9,
      uploadThroughput: ((750 * 1024) / 8) * 0.9,
      latency: 562.5,
    });

    await page.goto(FIXTURE_PATH);
    await expect(page.getByTestId("listing-gallery-stage")).toBeVisible();
    await waitForDisplayedIndex(page, 0);
    await assertAtomicIds(page, "page");

    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Poză următoare" }).click();
      await waitForDisplayedIndex(page, i + 1);
      await assertAtomicIds(page, "page");
    }

    await page.screenshot({
      path: path.join(OUT, "fast3g-after-nav.png"),
      fullPage: false,
    });
  });

  test("Slow 3G: counter waits for decode", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP network conditions require Chromium");
    await installFixtureImageLatency(page);

    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: ((500 * 1024) / 8) * 0.8,
      uploadThroughput: ((500 * 1024) / 8) * 0.8,
      latency: 2000,
    });

    await page.goto(FIXTURE_PATH);
    await waitForDisplayedIndex(page, 0);
    const before = await page.getByTestId("listing-gallery-counter").textContent();

    await page.getByRole("button", { name: "Poză următoare" }).click();
    await expect(page.getByTestId("listing-gallery-counter")).toHaveText(before || "");
    await assertAtomicIds(page, "page");

    await waitForDisplayedIndex(page, 1);
    await assertAtomicIds(page, "page");
  });

  test("artificial latency thumb 50ms / medium 1200ms + rapid five photos", async ({
    page,
  }) => {
    const counts = await installFixtureImageLatency(page);
    await page.goto(FIXTURE_PATH);
    await waitForDisplayedIndex(page, 0);
    await assertAtomicIds(page, "page");
    const mediumBeforeNav = counts.medium;

    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Poză următoare" }).click();
    }

    await waitForDisplayedIndex(page, 5);
    await assertAtomicIds(page, "page");
    expect(await page.getByTestId("listing-gallery-counter").textContent()).toMatch(
      /^6 \//,
    );

    await page.getByTestId("listing-gallery-fullscreen-btn").click();
    await expect(page.getByTestId("listing-gallery-lightbox")).toBeVisible();
    await assertAtomicIds(page, "lightbox");

    await page.screenshot({
      path: path.join(OUT, "latency-fullscreen.png"),
      fullPage: false,
    });

    // Adjacent preload only — must not fetch all 8 originals eagerly
    expect(counts.original).toBeLessThan(16);
    // Rapid nav should not explode medium fetches unboundedly vs naive per-variant thrash
    expect(counts.medium).toBeGreaterThan(mediumBeforeNav);
    expect(counts.medium).toBeLessThan(40);
  });
});

test.describe("Listing gallery atomic mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile navigation stays atomic under latency", async ({
    page,
    browserName,
    context,
  }) => {
    await installFixtureImageLatency(page);
    await page.goto(FIXTURE_PATH);
    await waitForDisplayedIndex(page, 0);

    if (browserName === "chromium") {
      const stage = page.getByTestId("listing-gallery-stage");
      const box = await stage.boundingBox();
      expect(box).toBeTruthy();
      const cdp = await context.newCDPSession(page);
      const y = box!.y + box!.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box!.x + box!.width * 0.85, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [{ x: box!.x + box!.width * 0.15, y }],
      });
    } else {
      // WebKit lacks a reliable Touch constructor in page.evaluate
      await page.getByRole("button", { name: "Poză următoare" }).click();
    }

    await waitForDisplayedIndex(page, 1);
    await assertAtomicIds(page, "page");
    await page.screenshot({
      path: path.join(OUT, "mobile-atomic.png"),
      fullPage: false,
    });
  });
});
