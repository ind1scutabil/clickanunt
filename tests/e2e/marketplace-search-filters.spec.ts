import { test, expect } from "@playwright/test";

/**
 * Public search / filter / visibility smoke (no auth required).
 * Runs against PLAYWRIGHT_BASE_URL (dedicated gate port).
 */
test.describe("Marketplace search and filters", () => {
  test("search query lands on /listings?q= and returns API-shaped results", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: /Caută în anunțuri/i });
    if (await search.isVisible()) {
      await search.click();
      await search.fill("telefon");
      await page.locator('form[role="search"] button[type="submit"]').click();
      await expect(page).toHaveURL(/\/listings\?(?:.*&)?q=telefon/i, { timeout: 15000 });
    } else {
      await page.goto("/listings?q=telefon");
    }

    const api = await request.get("/api/listings?q=telefon&limit=5");
    expect(api.status()).toBe(200);
    const body = await api.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test("search Enter submits the same as the button", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: /Caută în anunțuri/i });
    await expect(search).toBeVisible();
    await search.fill("peugeot");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/listings\?(?:.*&)?q=peugeot/i, { timeout: 15000 });
  });

  test("price band without currency is rejected", async ({ request }) => {
    const res = await request.get("/api/listings?priceMin=100&priceMax=500&limit=3");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error || "")).toMatch(/priceCurrency/i);
  });

  test("price band with RON is accepted", async ({ request }) => {
    const res = await request.get(
      "/api/listings?priceMin=1&priceMax=999999&priceCurrency=RON&limit=3"
    );
    expect(res.status()).toBe(200);
  });

  test("min > max is rejected", async ({ request }) => {
    const res = await request.get(
      "/api/listings?priceMin=500&priceMax=100&priceCurrency=RON&limit=3"
    );
    expect(res.status()).toBe(400);
  });

  test("Auto make on non-Auto category is rejected", async ({ request }) => {
    const res = await request.get(
      "/api/listings?category=Electronice%20%C8%99i%20electrocasnice&make=BMW&limit=3"
    );
    expect(res.status()).toBe(400);
  });

  test("status=all public is rejected", async ({ request }) => {
    const res = await request.get("/api/listings?status=all");
    expect(res.status()).toBe(400);
  });

  test("limit over 100 is rejected", async ({ request }) => {
    const res = await request.get("/api/listings?limit=101");
    expect(res.status()).toBe(400);
  });

  test("search results page is noindex", async ({ page }) => {
    await page.goto("/listings?q=peugeot");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
  });
});
