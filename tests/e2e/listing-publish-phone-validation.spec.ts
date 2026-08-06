/**
 * Publish UX: contact phone is optional server-side; empty must not silently block.
 * Invalid non-empty phone must show an accessible alert near the publish CTA.
 *
 * Uses ?continue + seeded localStorage draft at step 3 to avoid brittle multi-step
 * upload/category flows while still exercising the real publish CTA UI.
 */
import { test, expect, type Page, devices } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? process.env.E2E_USER_EMAIL ?? "alice@example.com";
const password = process.env.E2E_PASSWORD ?? process.env.E2E_USER_PASSWORD ?? "alice123";

const PHOTO =
  "/api/uploads/serve?key=listings/e86eeb24-69a1-497a-b86e-9142d7bb5293/original/1779061610719-mxiab.jpg";

function step3Draft(overrides: Record<string, unknown> = {}) {
  return {
    step: 3,
    title: "E2E Phone UX Seed Draft Title",
    category: "Electronice și electrocasnice",
    subcategory: "Telefoane mobile",
    priceType: "FIXED",
    priceAmount: 500,
    priceCurrency: "RON",
    salaryMode: "unspecified",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "RON",
    salaryPeriod: "MONTH",
    county: "București",
    city: "Sectorul 1",
    photos: [PHOTO],
    description: "Descriere suficient de lunga pentru publicare in testul E2E de telefon.",
    condition: "used",
    phone: "",
    allowMessages: true,
    attributes: {},
    lastSaved: Date.now(),
    ...overrides,
  };
}

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Conectează-te/i }).first().click();
  await page.waitForURL(/\/(dashboard|listings|admin)/, { timeout: 30_000 });
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: /Acceptă/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => undefined);
  }
}

async function openSeededContactStep(page: Page, draftOverrides: Record<string, unknown> = {}) {
  const draft = step3Draft(draftOverrides);
  await page.goto("/listings/new?continue=1");
  await page.evaluate((d) => {
    localStorage.setItem("listingDraft", JSON.stringify(d));
    localStorage.setItem("listingDraftVersion", "5");
  }, draft);
  await page.goto("/listings/new?continue=1");
  await dismissCookies(page);
  await expect(page.getByText("Contact & publicare")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#listing-contact-phone")).toBeVisible();
}

test.describe("Listing publish — phone validation UX", () => {
  test.describe.configure({ timeout: 120_000 });

  test("empty phone does not block publish (optional) — Chromium", async ({ page }) => {
    const posts: number[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/listings") && req.method() === "POST") posts.push(1);
    });

    await login(page);
    await openSeededContactStep(page, {
      title: `E2E Phone Opt ${Date.now().toString(36)}`,
      phone: "",
    });

    await expect(page.getByText(/opțional/i).first()).toBeVisible();
    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    await expect(publishBtn).toBeEnabled({ timeout: 20_000 });

    const createRes = page.waitForResponse(
      (res) => res.url().includes("/api/listings") && res.request().method() === "POST",
      { timeout: 90_000 }
    );
    await publishBtn.click();
    const res = await createRes;
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/listings\/[a-z0-9-]+/i, { timeout: 30_000 });
    expect(posts.length).toBeGreaterThanOrEqual(1);
  });

  test("invalid phone shows accessible alert and does not POST", async ({ page }) => {
    let sawPost = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/listings") && req.method() === "POST") sawPost = true;
    });

    await login(page);
    await openSeededContactStep(page, {
      title: `E2E Phone Bad ${Date.now().toString(36)}`,
      phone: "12",
    });

    const phone = page.locator("#listing-contact-phone");
    await expect(phone).toHaveValue("12");
    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    await publishBtn.click();

    const alert = page.getByRole("alert").filter({ hasText: /telefon este invalid/i });
    await expect(alert.first()).toBeVisible({ timeout: 10_000 });
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(publishBtn).not.toHaveText(/Se publică/i);
    await expect.poll(() => sawPost, { timeout: 2000 }).toBe(false);
    await expect(page.getByText(/E2E Phone Bad/i).first()).toBeVisible();
  });

  test("valid phone then publish — Mobile Chrome", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();
    await login(page);
    await openSeededContactStep(page, {
      title: `E2E Phone Mob ${Date.now().toString(36)}`,
      phone: "0712345678",
    });
    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    const createRes = page.waitForResponse(
      (res) => res.url().includes("/api/listings") && res.request().method() === "POST",
      { timeout: 90_000 }
    );
    await publishBtn.click();
    const res = await createRes;
    expect(res.ok()).toBeTruthy();
    await context.close();
  });

  test("keyboard: Completează numărul focuses phone with ARIA", async ({ page }) => {
    await login(page);
    await openSeededContactStep(page, {
      title: `E2E Phone A11y ${Date.now().toString(36)}`,
      phone: "xx",
    });
    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    await publishBtn.focus();
    await page.keyboard.press("Enter");
    const cta = page.getByRole("button", { name: /Completează numărul/i });
    await expect(cta).toBeVisible();
    await cta.focus();
    await page.keyboard.press("Enter");
    const phone = page.locator("#listing-contact-phone");
    await expect(phone).toBeFocused({ timeout: 5_000 });
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(phone).toHaveAttribute("aria-describedby", /listing-contact-phone-error/);
  });

  test("invalid phone alert visible at 320px width", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        document.documentElement.style.fontSize = "20px";
      } catch {
        /* ignore */
      }
    });
    await login(page);
    await openSeededContactStep(page, {
      title: `E2E Phone 320 ${Date.now().toString(36)}`,
      phone: "abc",
    });
    await page.getByRole("button", { name: /Publică anunțul/i }).click();
    const publishAlert = page
      .locator('[role="alert"]')
      .filter({ hasText: /telefon este invalid/i })
      .filter({ has: page.getByRole("button", { name: /Completează numărul/i }) });
    await expect(publishAlert).toBeVisible();
    await publishAlert.scrollIntoViewIfNeeded();
    await expect(publishAlert).toBeInViewport();
    await context.close();
  });
});
