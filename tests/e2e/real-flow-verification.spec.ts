/**
 * Real browser verification: login (real DB) → session after reload → create listing via API from page context.
 * Requires: dev server on localhost:3000, PostgreSQL with user matching E2E_EMAIL / E2E_PASSWORD
 * Default: alice@example.com / alice123 (ensure user exists in DB; seed script may fail to run — upsert manually if needed).
 * DB: listings must have `search_vector` if `listings_search_vector_trigger` exists (see fulltext migration).
 */
import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "alice@example.com";
const password = process.env.E2E_PASSWORD ?? "alice123";

test.describe("Real flow verification", () => {
  test("login, session persists after reload, create listing", async ({ page, context }) => {
    test.setTimeout(120_000);

    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 25_000 });

    const tokenAfterLogin = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(tokenAfterLogin, "accessToken must be set in localStorage after login").toBeTruthy();

    // Dev server keeps HMR / background requests open — networkidle can hang indefinitely.
    await page.reload({ waitUntil: "load" });

    const tokenAfterReload = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(tokenAfterReload, "accessToken must persist after full page reload").toBeTruthy();
    expect(tokenAfterReload).toBe(tokenAfterLogin);

    await expect(page).not.toHaveURL(/\/auth\/login/);

    const createStatus = await page.evaluate(async () => {
      const csrfRes = await fetch("/api/csrf", { credentials: "include" });
      if (!csrfRes.ok) return { ok: false, step: "csrf", status: csrfRes.status };
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (!csrfToken) return { ok: false, step: "csrfBody" };

      const bearer = localStorage.getItem("accessToken");
      if (!bearer) return { ok: false, step: "noBearer" };

      // Avoid 13-digit runs in title — detectPersonalInfo treats them as Romanian CNP.
      const payload = {
        title: `E2E Verificare ${crypto.randomUUID()}`,
        description: "Descriere minimă zece caractere pentru test automat.",
        category: "Altele",
        priceAmount: 100,
        priceCurrency: "RON",
        condition: "used",
        county: "București",
        city: "București",
        photos: [
          "https://www.clickanunt.ro/uploads/listings/e2e-verification-sample/original/placeholder.jpg",
        ],
        contactPhone: "0712345678",
        allowMessages: true,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(payload),
      });

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* empty */
      }
      return { ok: res.ok, status: res.status, step: "post", body };
    });

    expect(
      createStatus.ok,
      `Create listing failed: ${JSON.stringify(createStatus)}`
    ).toBeTruthy();
  });
});
