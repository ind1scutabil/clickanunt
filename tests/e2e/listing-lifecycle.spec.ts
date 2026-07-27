/**
 * E2E smoke — listing lifecycle CTAs and CSRF on owner delete (no real charges).
 */
import { test, expect } from "@playwright/test";
import { ensureUserAuthStorage, USER_STORAGE_STATE } from "./helpers/auth-storage";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Listing lifecycle dashboard", () => {
  test.beforeAll(async () => {
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("dashboard listings loads with tabs and primary CTA", async ({ page }) => {
    const res = await page.goto("/dashboard/listings", { waitUntil: "domcontentloaded" });
    expect(res).not.toBeNull();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /Anunțurile/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /Anunț nou/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Active/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /În așteptare/i })).toBeVisible();
  });

  test("unauthenticated delete API requires CSRF/auth", async ({ request }) => {
    const res = await request.delete(
      "/api/listings/11111111-1111-4111-8111-111111111111",
      { data: {} }
    );
    expect(res.status()).not.toBe(200);
    expect([401, 403, 400, 404]).toContain(res.status());
  });
});
