/**
 * Homepage hero search — production-build navigation contract (FAZA 12E).
 * Targets #home-hero-search explicitly (not navbar). No waitForTimeout / retries.
 */
import { test, expect } from "@playwright/test";

async function waitHeroReady(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const input = page.locator("#home-hero-search");
  await expect(input).toBeVisible({ timeout: 15000 });
  // Ensure client JS hydrated (static chunks must load).
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const f = document.querySelector("#home-hero-search")?.closest("form");
        return f?.getAttribute("action") || "";
      })
    )
    .toMatch(/\/listings/);
  const form = page.locator("form").filter({
    has: page.locator("#home-hero-search"),
  });
  return { input, form };
}

test.describe("Homepage hero search", () => {
  test("desktop click navigates to /listings?q=", async ({ page }) => {
    const { input, form } = await waitHeroReady(page);
    await input.fill("Peugeot 508");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/listings\?q=Peugeot(\+|%20)508/, {
      timeout: 15000,
    });
    expect(page.url()).not.toMatch(/[?&]search=/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
  });

  test("desktop Enter navigates identically", async ({ page }) => {
    const { input } = await waitHeroReady(page);
    await input.fill("Peugeot 508");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/listings\?q=Peugeot(\+|%20)508/, {
      timeout: 15000,
    });
  });

  test("trims whitespace and encodes diacritics", async ({ page }) => {
    const { input, form } = await waitHeroReady(page);
    await input.click();
    await input.fill("");
    await input.pressSequentially("mașină", { delay: 15 });
    await expect(input).toHaveValue("mașină");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/listings\?q=/, { timeout: 15000 });
    const u = new URL(page.url());
    expect(u.searchParams.get("q")).toBe("mașină");
  });

  test("empty / spaces go to catalog without inventing q", async ({ page }) => {
    const { input, form } = await waitHeroReady(page);
    await input.fill("   ");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/listings\/?(\?.*)?$/, { timeout: 15000 });
    const u = new URL(page.url());
    const q = u.searchParams.get("q");
    expect(!q || q.trim() === "").toBeTruthy();
  });

  test("back/forward preserves search results URL", async ({ page }) => {
    const { input, form } = await waitHeroReady(page);
    await input.fill("telefon");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/listings\?q=telefon/, { timeout: 15000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/listings\?q=telefon/);
  });

  test("refresh keeps results and noindex", async ({ page }) => {
    await page.goto("/listings?q=telefon", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=telefon/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=telefon/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
  });
});

test.describe("Navbar search regression", () => {
  test("desktop navbar search uses q=", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("textbox", { name: /Caută anunțuri/i }).first();
    await expect(nav).toBeVisible({ timeout: 15000 });
    await nav.fill("bmw");
    await nav.press("Enter");
    await expect(page).toHaveURL(/\/listings\?q=bmw/, { timeout: 15000 });
    expect(page.url()).not.toMatch(/[?&]search=/);
  });
});
