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

  test("FTS priceAsc differs from priceDesc with currency", async ({ request }) => {
    const asc = await request.get(
      "/api/listings?q=telefon&sort=priceAsc&priceCurrency=RON&limit=10"
    );
    const desc = await request.get(
      "/api/listings?q=telefon&sort=priceDesc&priceCurrency=RON&limit=10"
    );
    expect(asc.status()).toBe(200);
    expect(desc.status()).toBe(200);
    const ascBody = await asc.json();
    const descBody = await desc.json();
    const ascAmounts = (ascBody.data || [])
      .filter((r: { priceAmount: number | null; priceType?: string | null }) =>
        r.priceAmount != null &&
        (r.priceType == null || ["FIXED", "NEGOTIABLE", "FROM"].includes(String(r.priceType)))
      )
      .map((r: { priceAmount: number }) => r.priceAmount);
    const descAmounts = (descBody.data || [])
      .filter((r: { priceAmount: number | null; priceType?: string | null }) =>
        r.priceAmount != null &&
        (r.priceType == null || ["FIXED", "NEGOTIABLE", "FROM"].includes(String(r.priceType)))
      )
      .map((r: { priceAmount: number }) => r.priceAmount);
    if (ascAmounts.length >= 2) {
      const ascSorted = [...ascAmounts].sort((a, b) => a - b);
      expect(ascAmounts).toEqual(ascSorted);
    }
    if (descAmounts.length >= 2) {
      const descSorted = [...descAmounts].sort((a, b) => b - a);
      expect(descAmounts).toEqual(descSorted);
    }
    if (ascAmounts.length >= 2 && descAmounts.length >= 2) {
      expect(ascAmounts[0]).not.toBe(descAmounts[0]);
    }
  });

  test("FTS price sort without currency is rejected", async ({ request }) => {
    const res = await request.get("/api/listings?q=telefon&sort=priceAsc&limit=5");
    expect(res.status()).toBe(400);
  });

  test("FTS newest with q is not identical to relevance-only default shape when sort set", async ({
    request,
  }) => {
    const newest = await request.get("/api/listings?q=telefon&sort=newest&limit=5");
    expect(newest.status()).toBe(200);
    const body = await newest.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    const dates = (body.data || []).map((r: { createdAt: string }) => r.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeGreaterThanOrEqual(new Date(dates[i]).getTime());
    }
  });

  test("sort persists in listings URL", async ({ page }) => {
    await page.goto("/listings?q=telefon&sort=newest");
    await expect(page).toHaveURL(/sort=newest/);
    const sortSelect = page.locator("select").filter({ hasText: "Cele mai noi" }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption("price-asc");
      await expect(page).toHaveURL(/sort=priceAsc/);
      await expect(page).toHaveURL(/priceCurrency=RON/);
      await expect(page).toHaveURL(/q=telefon/);
    }
  });

  test("non-FTS priceAsc requires currency", async ({ request }) => {
    const res = await request.get("/api/listings?sort=priceAsc&limit=10");
    expect(res.status()).toBe(400);
  });

  test("non-FTS priceDesc RON does not mix EUR amounts ahead of RON", async ({ request }) => {
    const res = await request.get(
      "/api/listings?sort=priceDesc&priceCurrency=RON&limit=30"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.data || [];
    let seenNonComparable = false;
    for (const row of items) {
      const comparable =
        row.priceAmount != null &&
        row.priceCurrency === "RON" &&
        (row.priceType == null ||
          ["FIXED", "NEGOTIABLE", "FROM"].includes(String(row.priceType)));
      if (comparable) {
        expect(seenNonComparable).toBe(false);
        expect(row.priceCurrency).toBe("RON");
      } else {
        seenNonComparable = true;
      }
    }
    // No EUR FIXED/NEGOTIABLE/FROM should appear before RON comparables
    const firstComparableIdx = items.findIndex(
      (r: { priceAmount: number | null; priceCurrency: string | null; priceType?: string | null }) =>
        r.priceAmount != null &&
        r.priceCurrency === "RON" &&
        (r.priceType == null || ["FIXED", "NEGOTIABLE", "FROM"].includes(String(r.priceType)))
    );
    if (firstComparableIdx >= 0) {
      for (let i = 0; i < firstComparableIdx; i++) {
        const r = items[i];
        const eurComparable =
          r.priceAmount != null &&
          r.priceCurrency === "EUR" &&
          (r.priceType == null || ["FIXED", "NEGOTIABLE", "FROM"].includes(String(r.priceType)));
        expect(eurComparable).toBe(false);
      }
    }
  });

  test("FTS and non-FTS priceAsc RON share currency policy on overlapping set", async ({
    request,
  }) => {
    const fts = await request.get(
      "/api/listings?q=telefon&sort=priceAsc&priceCurrency=RON&limit=20"
    );
    const catalog = await request.get(
      "/api/listings?sort=priceAsc&priceCurrency=RON&limit=50"
    );
    expect(fts.status()).toBe(200);
    expect(catalog.status()).toBe(200);
    const ftsItems = (await fts.json()).data || [];
    const catalogItems = (await catalog.json()).data || [];
    const catalogById = new Map(
      catalogItems.map((r: { id: string }) => [r.id, r])
    );
    const ftsComparable = ftsItems.filter(
      (r: { priceAmount: number | null; priceCurrency: string | null; priceType?: string | null }) =>
        r.priceAmount != null &&
        r.priceCurrency === "RON" &&
        (r.priceType == null || ["FIXED", "NEGOTIABLE", "FROM"].includes(String(r.priceType)))
    );
    for (let i = 1; i < ftsComparable.length; i++) {
      expect(ftsComparable[i - 1].priceAmount).toBeLessThanOrEqual(
        ftsComparable[i].priceAmount
      );
    }
    // Every FTS hit present in catalog page must remain RON-comparable ordered
    for (const row of ftsComparable) {
      const cat = catalogById.get(row.id) as
        | { priceCurrency: string; priceAmount: number }
        | undefined;
      if (cat) {
        expect(cat.priceCurrency).toBe("RON");
      }
    }
  });
});
