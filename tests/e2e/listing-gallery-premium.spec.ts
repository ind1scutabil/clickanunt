/**
 * Listing gallery premium UI smoke + visual captures.
 * PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/listing-gallery-premium.spec.ts --project=chromium --project="Mobile Chrome"
 */
import { test, expect } from "@playwright/test";
import path from "node:path";

const OUT = path.join(process.cwd(), "test-results", "gallery-after");

async function firstListingWithPhotos(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get("/api/listings?status=active&limit=50");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  const rows = (json.data ?? []) as Array<{ id: string; photos?: unknown[] }>;
  const hit = rows.find((l) => Array.isArray(l.photos) && l.photos.length > 0);
  return hit?.id ?? null;
}

test.describe("Listing photo gallery premium", () => {
  test("in-page gallery and lightbox interactions", async ({ page, request }) => {
    const id = await firstListingWithPhotos(request);
    test.skip(!id, "no local listings with photos");

    await page.goto(`/listings/${id}`);
    const gallery = page.getByTestId("listing-photo-gallery");
    await expect(gallery).toBeVisible();
    await expect(page.getByTestId("listing-gallery-stage")).toBeVisible();

    const stageBox = await page.getByTestId("listing-gallery-stage").boundingBox();
    expect(stageBox?.height ?? 0).toBeGreaterThan(250);

    await page.getByTestId("listing-gallery-fullscreen-btn").click();
    const lb = page.getByTestId("listing-gallery-lightbox");
    await expect(lb).toBeVisible();
    await expect(lb).toHaveAttribute("aria-modal", "true");

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(lb).toHaveCount(0);

    // no horizontal overflow on listing page
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(overflow).toBeFalsy();
  });

  test("desktop screenshots 1920 and 1440", async ({ page, request }) => {
    const id = await firstListingWithPhotos(request);
    test.skip(!id, "no local listings with photos");

    for (const [w, h, name] of [
      [1920, 1080, "desktop-1920"],
      [1440, 900, "desktop-1440"],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`/listings/${id}`);
      await expect(page.getByTestId("listing-gallery-stage")).toBeVisible();
      await page.screenshot({
        path: path.join(OUT, `${name}-page.png`),
        fullPage: false,
      });
      await page.getByTestId("listing-gallery-fullscreen-btn").click();
      await expect(page.getByTestId("listing-gallery-lightbox")).toBeVisible();
      await page.screenshot({
        path: path.join(OUT, `${name}-fullscreen.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Listing photo gallery mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile page and fullscreen screenshots", async ({ page, request }) => {
    const id = await firstListingWithPhotos(request);
    test.skip(!id, "no local listings with photos");
    await page.goto(`/listings/${id}`);
    await expect(page.getByTestId("listing-gallery-stage")).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, "mobile-390-page.png"),
      fullPage: false,
    });
    await page.getByTestId("listing-gallery-fullscreen-btn").click();
    await expect(page.getByTestId("listing-gallery-lightbox")).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, "mobile-390-fullscreen.png"),
      fullPage: false,
    });
  });
});

test.describe("Listing photo gallery mobile large", () => {
  test.use({ viewport: { width: 430, height: 932 } });

  test("mobile 430 screenshot", async ({ page, request }) => {
    const id = await firstListingWithPhotos(request);
    test.skip(!id, "no local listings with photos");
    await page.goto(`/listings/${id}`);
    await page.screenshot({
      path: path.join(OUT, "mobile-430-page.png"),
      fullPage: false,
    });
  });
});
