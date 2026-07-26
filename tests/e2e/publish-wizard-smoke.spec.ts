/**
 * Publish UX smoke — auth gate, no dead routes, category sheet, no Titlu perfect.
 * Does not create production listings; skips full publish if DB fixtures missing.
 */
import { test, expect } from "@playwright/test";
import {
  USER_STORAGE_STATE,
  ensureUserAuthStorage,
} from "./helpers/auth-storage";

test.describe("Publish wizard smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("listings/new loads; no Titlu perfect; category sheet on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Skip step 0 if present
    const manual = page.getByRole("button", { name: /completează manual/i });
    if (await manual.isVisible().catch(() => false)) {
      await manual.click();
    }

    const title = page.locator('input[placeholder*="iPhone"], input[placeholder*="Titlu"]').first();
    if (await title.isVisible().catch(() => false)) {
      await title.fill("Peugeot");
      await expect(page.getByText(/Titlu perfect/i)).toHaveCount(0);
      await expect(page.getByTestId("title-feedback")).toContainText(/scurt|modelul|clar/i);
    }

    await expect(page.locator('a[href="/dashboard/listings/create"]')).toHaveCount(0);
    await expect(page.locator('input[accept="video/*"]')).toHaveCount(0);

    if (isMobile) {
      const bottomCatalog = page.getByRole("navigation", { name: /Navigare rapidă/i });
      await expect(bottomCatalog).toHaveCount(0);

      const cookie = page.getByRole("dialog", { name: /Consimțământ cookie/i });
      if (await cookie.isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /Accept|Refuz|Salveaz/i }).first().click().catch(() => {});
      }

      const openCat = page.getByRole("button", { name: /Alege categoria/i }).first();
      if (await openCat.isVisible().catch(() => false)) {
        await openCat.click();
        const catDialog = page.getByRole("dialog", { name: /Alege categoria/i });
        await expect(catDialog).toBeVisible();
        await expect(page.getByRole("heading", { name: /Alege categoria/i })).toBeVisible();
        await catDialog.getByRole("button", { name: "Închide", exact: true }).click();
      }

      const pad = await page.evaluate(() => {
        const el = document.getElementById("main-content");
        return {
          hide: document.documentElement.dataset.hideMobileBottomNav,
          pb: el ? getComputedStyle(el).paddingBottom : "",
        };
      });
      expect(pad.hide).toBe("1");
      expect(parseFloat(pad.pb || "0")).toBeLessThan(80);
    }
  });

  test("legacy /dashboard/listings/create redirects to /listings/new", async ({ page }) => {
    await page.goto("/dashboard/listings/create", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/listings\/new/, { timeout: 15_000 });
  });
});

test.describe("Publish auth gate", () => {
  // Explicit empty storage — must not inherit cookies/JWT from other describes.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated redirects to login with next", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/next=/);
  });
});
