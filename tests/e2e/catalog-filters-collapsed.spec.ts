import { expect, test } from "@playwright/test";

/** Catalog defaults to results-first (filters collapsed). */
test.describe("Catalog filters collapsed by default", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "clickanunt_cookie_consent_v1",
        JSON.stringify({
          v: 1,
          necessary: true,
          analytics: false,
          marketing: false,
          decidedAt: new Date().toISOString(),
        })
      );
    });
  });

  test("mobile shows results toggle, not full filter form", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/listings");
    await expect(page.getByRole("button", { name: /Afișează filtre/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Filtre$/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Afișează filtre/i }).click();
    await expect(page.getByRole("heading", { name: /^Filtre$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Aplică filtre/i })).toBeVisible();
    const apply = page.getByRole("button", { name: /Aplică filtre/i });
    const box = await apply.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
