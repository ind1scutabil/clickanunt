/**
 * Publish auth gate — stable across Chromium / Mobile Chrome / WebKit.
 * Uses API-prepared storageState for authenticated cases (no login spam).
 * Open-redirect matrix is covered by unit tests; E2E checks one live next= round-trip.
 */
import { test, expect } from "@playwright/test";
import {
  ensureAdminAuthStorage,
  ensureUserAuthStorage,
  USER_STORAGE_STATE,
  ADMIN_STORAGE_STATE,
} from "./helpers/auth-storage";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Publish auth — anonymous", () => {
  test.describe.configure({ mode: "serial" });

  test("logged-out /listings/new → login?next=/listings/new, no wizard, no upload POST", async ({
    page,
  }) => {
    const uploadPosts: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (
        req.method() === "POST" &&
        u.includes("/api/uploads") &&
        !u.includes("/api/uploads/serve")
      ) {
        uploadPosts.push(u);
      }
    });

    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth\/login/, { timeout: 20000 });
    const u = new URL(page.url());
    expect(u.pathname).toBe("/auth/login");
    expect(u.searchParams.get("next")).toBe("/listings/new");
    await expect(page.getByText("Publică anunțul GRATUIT")).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    expect(uploadPosts).toEqual([]);
  });

  test("back/forward after redirect stays on-site login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth\/login/, { timeout: 20000 });
    await page.goBack();
    await page.goForward();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Publish auth — next= round-trip (one UI login)", () => {
  test.describe.configure({ mode: "serial", timeout: 90000 });

  test("login with next=/listings/new returns exactly there", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login?next=%2Flistings%2Fnew", { waitUntil: "domcontentloaded" });
    const email = process.env.E2E_USER_EMAIL ?? process.env.E2E_EMAIL ?? "user@example.com";
    const password =
      process.env.E2E_USER_PASSWORD ?? process.env.E2E_PASSWORD ?? "Password123!";
    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');
    await emailInput.click();
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email);
    await passInput.click();
    await passInput.fill(password);
    await expect(passInput).toHaveValue(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/listings\/new$/, { timeout: 60000 });
    expect(new URL(page.url()).pathname).toBe("/listings/new");
    await page.waitForFunction(
      () =>
        /Selectează categor|Categorie|Publică anunț|Titlu|Fotograf|Descriere|Marca/i.test(
          document.body.innerText || "",
        ),
      null,
      { timeout: 45000 },
    );
  });

  test("evil next stays on-site after login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login?next=https%3A%2F%2Fevil.example%2F", {
      waitUntil: "domcontentloaded",
    });
    const email = process.env.E2E_USER_EMAIL ?? process.env.E2E_EMAIL ?? "user@example.com";
    const password =
      process.env.E2E_USER_PASSWORD ?? process.env.E2E_PASSWORD ?? "Password123!";
    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');
    await emailInput.click();
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email);
    await passInput.click();
    await passInput.fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60000 });
    expect(page.url()).not.toMatch(/evil\.example/i);
    expect(new URL(page.url()).origin).toMatch(/localhost|127\.0\.0\.1/);
  });
});

test.describe("Publish auth — user storageState", () => {
  test.beforeAll(async () => {
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("authenticated user sees publish form without login UI", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await page.waitForFunction(
      () =>
        /Selectează categor|Categorie|Publică anunț|Titlu|Fotograf|Descriere|Marca/i.test(
          document.body.innerText || "",
        ),
      null,
      { timeout: 45000 },
    );
  });
});

test.describe("Publish auth — admin storageState", () => {
  test.beforeAll(async () => {
    await ensureAdminAuthStorage(baseURL);
  });

  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("admin sees publish form or stays on-site", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(page.url()).not.toMatch(/evil/i);
    const path = new URL(page.url()).pathname;
    if (path === "/listings/new") {
      await page.waitForFunction(
        () =>
          /Selectează categor|Categorie|Publică anunț|Titlu|Fotograf|Descriere|Marca/i.test(
            document.body.innerText || "",
          ),
        null,
        { timeout: 45000 },
      );
    } else {
      // 2FA or admin home — still same origin
      expect(new URL(page.url()).origin).toMatch(/localhost|127\.0\.0\.1/);
    }
  });
});
