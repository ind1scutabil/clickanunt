/**
 * Auto create + country select + publish (regression: Messenger WebView select crash).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import { seedCookieConsentAccepted } from "./helpers/cookie-consent";
import { pickCategoryAndSubcategory } from "./helpers/category-picker";

const email = process.env.E2E_EMAIL ?? "alice@example.com";
const password = process.env.E2E_PASSWORD ?? "alice123";
const FIXTURE = path.join(__dirname, "../fixtures/listing-photos/landscape-small.jpg");

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|listings|admin)/, { timeout: 30_000 });
}

async function goToManualStep1(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("listingDraft");
    localStorage.removeItem("listingDraftVersion");
  });
  await page.goto("/listings/new");
  await page.getByRole("button", { name: /completează manual/i }).click();
  await expect(page.getByText("Informații esențiale")).toBeVisible({ timeout: 15_000 });
}

/** "Auto, moto și ambarcațiuni" has subcategories, so one is mandatory to select. */
async function pickAutoCategory(page: Page, stepCard: ReturnType<Page["locator"]>) {
  await pickCategoryAndSubcategory(page, stepCard, "Auto, moto și ambarcațiuni", "Autoturisme");
}

test.describe("Auto listing — country select + publish", () => {
  test.describe.configure({ timeout: 180_000 });

  test("desktop — select Spania, publish, no client exception", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await seedCookieConsentAccepted(page);

    await login(page);
    await goToManualStep1(page);

    const stepCard = page.locator(".card").filter({ hasText: "Titlu anunț" });
    const title = `E2E Auto Country ${Date.now().toString(36)}`;
    await stepCard.getByPlaceholder(/iPhone 14 Pro/i).fill(title);
    await pickAutoCategory(page, stepCard);
    await stepCard.locator('input[type="number"]').fill("15000");
    await stepCard
      .locator("select")
      .filter({ has: page.locator('option:has-text("București")') })
      .selectOption({ label: "București" });
    await stepCard
      .locator("select")
      .filter({ has: page.locator('option:has-text("Sectorul 1")') })
      .selectOption({ label: "Sectorul 1" });

    await stepCard.locator('input[type="file"]').setInputFiles(FIXTURE);
    await expect(page.locator("text=/poză adăugată|poze adăugate/i")).toBeVisible({ timeout: 90_000 });

    await stepCard.getByRole("button", { name: /Continuă →/ }).click();
    await expect(page.getByText("Detalii despre anunț")).toBeVisible({ timeout: 15_000 });

    const countrySelect = page
      .locator("select")
      .filter({ has: page.locator('option[value="ES"]') })
      .first();
    await countrySelect.selectOption("ES");

    await page.locator("textarea").fill(
      "Anunț test auto cu țara Spania pentru verificare publicare fără crash."
    );
    await page.getByRole("button", { name: /Continuă →/ }).click();
    await expect(page.getByText("Contact & publicare")).toBeVisible();

    await page.locator('input[type="tel"]').fill("0712345678");
    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    await expect(publishBtn).toBeEnabled({ timeout: 10_000 });

    const createRes = page.waitForResponse(
      (res) => res.url().includes("/api/listings") && res.request().method() === "POST",
      { timeout: 90_000 }
    );
    await publishBtn.click();
    const res = await createRes;
    expect(res.status()).toBeLessThan(500);

    await page.waitForURL(/\/listings\/[^/]+$/, { timeout: 90_000 }).catch(() => null);
    expect(await page.locator("text=/Application error|client-side exception/i").count()).toBe(0);
    expect(pageErrors.filter((m) => !/csrf|401|Limită/i.test(m))).toEqual([]);
  });

  test("Messenger WebView — country step renders and publish", async ({ page, context }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await seedCookieConsentAccepted(page);

    await context.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBID/phone;FBLC/ro_RO;FBOP/5]",
    });
    await page.setViewportSize({ width: 390, height: 664 });

    await login(page);
    await goToManualStep1(page);

    const stepCard = page.locator(".card").filter({ hasText: "Titlu anunț" });
    await stepCard.getByPlaceholder(/iPhone 14 Pro/i).fill(`E2E FB Auto ${Date.now().toString(36)}`);
    await pickAutoCategory(page, stepCard);
    await stepCard.locator('input[type="number"]').fill("9900");
    await stepCard
      .locator("select")
      .filter({ has: page.locator('option:has-text("București")') })
      .selectOption({ label: "București" });
    await stepCard
      .locator("select")
      .filter({ has: page.locator('option:has-text("Sectorul 1")') })
      .selectOption({ label: "Sectorul 1" });
    await stepCard.locator('input[type="file"]').setInputFiles(FIXTURE);
    await expect(page.locator("text=/poză adăugată|poze adăugate/i")).toBeVisible({ timeout: 90_000 });

    await stepCard.getByRole("button", { name: /Continuă →/ }).click();
    await expect(page.getByText("Detalii despre anunț")).toBeVisible({ timeout: 15_000 });

    await page.locator("select").filter({ has: page.locator('option[value="JP"]') }).first().selectOption("JP");
    await page.locator("textarea").fill(
      "Test Messenger WebView publicare auto cu țară Japonia fără eroare client."
    );
    await page.getByRole("button", { name: /Continuă →/ }).click();
    await page.locator('input[type="tel"]').fill("0712345678");

    const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
    await publishBtn.click();

    await page.waitForURL(/\/listings\/[^/]+$/, { timeout: 90_000 }).catch(() => null);
    expect(await page.locator("text=/Application error|client-side exception/i").count()).toBe(0);
    const fatal = pageErrors.filter(
      (m) => !/csrf|401|Limită|Failed to fetch|NetworkError/i.test(m)
    );
    expect(fatal).toEqual([]);
  });
});
