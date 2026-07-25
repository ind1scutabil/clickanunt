/**
 * Pre-deploy UI smoke — read-only where possible.
 * Run: PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/predeploy-ui-smoke.spec.ts --project=chromium --project="Mobile Chrome"
 */
import { test, expect } from "@playwright/test";

test.describe("Pre-deploy UI smoke", () => {
  test("homepage loads with brand and listings links", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ClickAnunț/i);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("footer").first()).toBeVisible();
  });

  test("catalog and search UI", async ({ page }) => {
    await page.goto("/listings");
    await expect(page).toHaveURL(/listings/);
    // Prefer visible search control (desktop + mobile layouts both exist in DOM).
    const search = page.getByPlaceholder(/caută în anunțuri/i).filter({ visible: true }).first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill("auto");
    await search.press("Enter");
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("category filter via URL", async ({ page }) => {
    await page.goto(`/listings?category=${encodeURIComponent("Altele")}`);
    await expect(page).toHaveURL(/listings/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("listing detail + gallery/thumbs when photos exist", async ({ page, request }) => {
    const res = await request.get("/api/listings?status=active&limit=5");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const withPhotos = (json.data ?? []).find(
      (l: { id?: string; photos?: unknown[] }) => Array.isArray(l.photos) && l.photos.length > 0,
    );
    const id = withPhotos?.id as string | undefined;
    test.skip(!id, "no public listings with photos in local DB");
    await page.goto(`/listings/${id}`);
    await expect(page.locator("main, #main-content, body").first()).toBeVisible();
    // Title may be h1 or in breadcrumb/header; require at least one content image or photo region.
    const imgs = page.locator("img");
    await expect(imgs.first()).toBeVisible({ timeout: 15_000 });
  });

  test("favorites page loads (no permanent mutation)", async ({ page }) => {
    await page.goto("/favorites");
    await expect(page.locator("body")).toBeVisible();
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots?.toLowerCase()).toMatch(/noindex/);
  });

  test("login form renders", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("dashboard loads with noindex", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots?.toLowerCase()).toMatch(/noindex/);
  });

  test("messages inbox loads without sending", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.locator("body")).toBeVisible();
    // Do not click send / compose submit
  });

  test("robots.txt is technical-only disallow", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("Disallow: /api/");
    expect(text).not.toContain("Disallow: /dashboard");
  });
});

test.describe("Pre-deploy mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("homepage and catalog on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/listings");
    await expect(page.locator("body")).toBeVisible();
  });
});
