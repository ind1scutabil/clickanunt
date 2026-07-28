import { expect, test } from "@playwright/test";

/**
 * FAZA 17B — mobile header: search remains usable at narrow widths;
 * progressive disclosure keeps Favorite/Mesaje in the hamburger below 400px.
 */
test.describe("Mobile navbar search usability", () => {
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

  for (const vp of [
    { w: 320, h: 568 },
    { w: 360, h: 800 },
    { w: 390, h: 844 },
  ] as const) {
    test(`search input usable at ${vp.w}x${vp.h}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto("/");
      const input = page.getByRole("textbox", { name: /Caută anunțuri mobile/i });
      await expect(input).toBeVisible();
      const box = await input.boundingBox();
      expect(box, "search input bounding box").toBeTruthy();
      expect(box!.width, `search width at ${vp.w}`).toBeGreaterThanOrEqual(72);
      expect(box!.height, `search height at ${vp.w}`).toBeGreaterThanOrEqual(36);

      await input.fill("bmw");
      await expect(input).toHaveValue("bmw");

      const fav = page.locator('a[aria-label="Favorite"]').first();
      const msg = page.locator('a[aria-label="Mesaje"]').first();
      if (vp.w < 480) {
        await expect(fav).toBeHidden();
        await expect(msg).toBeHidden();
      } else {
        await expect(fav).toBeVisible();
        await expect(msg).toBeVisible();
      }

      const add = page.getByRole("link", { name: "Adaugă anunț" }).first();
      const menu = page.getByRole("button", { name: /meniu/i }).first();
      await expect(add).toBeVisible();
      await expect(menu).toBeVisible();
      const addBox = await add.boundingBox();
      const menuBox = await menu.boundingBox();
      expect(addBox!.width).toBeGreaterThanOrEqual(44);
      expect(addBox!.height).toBeGreaterThanOrEqual(44);
      expect(menuBox!.width).toBeGreaterThanOrEqual(44);
      expect(menuBox!.height).toBeGreaterThanOrEqual(44);

      await menu.click();
      await expect(page.getByRole("navigation", { name: /Navigare mobilă/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /^Favorite/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^Mesaje/i }).first()).toBeVisible();
    });
  }
});
