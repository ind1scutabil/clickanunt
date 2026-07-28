import { expect, test } from "@playwright/test";

test.describe("FAZA 17C — publish SSR auth + detail SSR shell", () => {
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

  test("unauthenticated /listings/new hard-redirects to login next", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Flistings%2Fnew/);
  });

  test("detail first paint has gallery stage without loading-only skeleton swap", async ({
    page,
  }) => {
    const id = process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";
    await page.goto(`/listings/${id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("listing-gallery-stage")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("heading", { name: /Anunțuri similare/i })).toBeVisible();
    // Gallery stage must not be a nested button
    await expect(page.getByTestId("listing-gallery-stage")).not.toHaveAttribute("role", "button");
  });

  test("publish flow sets data-publish-flow for bottom-nav padding contract", async ({
    page,
  }) => {
    const csrf = await page.request.get("/api/csrf");
    const { csrfToken } = await csrf.json();
    const login = await page.request.post("/api/auth/login", {
      data: {
        email: process.env.E2E_USER_EMAIL || "user@example.com",
        password: process.env.E2E_USER_PASSWORD || "Password123!",
      },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(login.status()).toBe(200);
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/listings\/new/);
    const flag = await page.evaluate(() => {
      const el = document.querySelector("[data-publish-flow='1']");
      const hide = document.documentElement.dataset.hideMobileBottomNav;
      return { hasFlow: !!el, hide };
    });
    expect(flag.hasFlow).toBeTruthy();
    expect(flag.hide).toBe("1");
    await expect(page.getByRole("navigation", { name: /Navigare rapidă/i })).toHaveCount(0);
  });
});
