/**
 * Manual Business upgrade path (no self-serve billing).
 * Dashboard CTA → /business → /contact
 */
import { test, expect } from "@playwright/test";
import {
  USER_STORAGE_STATE,
  ensureUserAuthStorage,
} from "./helpers/auth-storage";

test.describe("Business upgrade path", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("dashboard free CTA → /business → /contact (no /dashboard/billing)", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Wait for client dashboard (not perpetual spinner)
    await expect(page.getByText("Plan actual")).toBeVisible({ timeout: 20_000 });

    const billingLinks = page.locator('a[href="/dashboard/billing"]');
    await expect(billingLinks).toHaveCount(0);

    const cta = page.getByTestId("dashboard-business-cta");
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await expect(cta).toHaveAttribute("href", "/business");
    await expect(cta).toContainText(/Descoperă ClickAnunț Business/i);

    await expect(
      page.getByText(
        /Soluții pentru dealeri și companii, stabilite în funcție de necesar/
      )
    ).toBeVisible();

    await cta.click();
    await expect(page).toHaveURL(/\/business/);
    expect(page.url()).not.toContain("/dashboard/billing");

    const contactCta = page
      .locator('a[href="/contact"]')
      .filter({ hasText: /Solicită ofertă|contact/i })
      .first();
    await expect(contactCta).toBeVisible({ timeout: 15_000 });
    await contactCta.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test("direct refresh on /business stays 200", async ({ page }) => {
    const res = await page.goto("/business");
    expect(res?.status()).toBe(200);
    await page.reload();
    await expect(page).toHaveURL(/\/business/);
    await expect(
      page.getByRole("heading", { name: /ClickAnunț Business|Business|ofertă/i }).first()
    ).toBeVisible();
  });
});

test.describe("Business page public", () => {
  test("unauthenticated /business is reachable", async ({ page }) => {
    const res = await page.goto("/business");
    expect(res?.status()).toBe(200);
    await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
  });
});
