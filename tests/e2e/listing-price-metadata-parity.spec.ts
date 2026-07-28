/**
 * Read-only: listing detail price in title / visible UI must match major units (not /100).
 * Targets Chromium, Mobile Chrome, and WebKit via Playwright projects.
 */
import { test, expect } from "@playwright/test";

const PEUGEOT_ID = "de63e45e-fa79-427d-83ce-c34b2b99b0fc";
const EXPECTED_PRICE = "10.290 EUR";
const FORBIDDEN_CENTS = "102.90";

test.describe("Listing detail price metadata parity", () => {
  test("title, visible price, and HTML omit cents misformat", async ({ page }) => {
    const res = await page.goto(`/listings/${PEUGEOT_ID}`, {
      waitUntil: "domcontentloaded",
    });
    expect(res?.ok()).toBeTruthy();

    const title = await page.title();
    expect(title).toContain(EXPECTED_PRICE);
    expect(title).not.toContain(FORBIDDEN_CENTS);

    const html = await page.content();
    expect(html).toContain(EXPECTED_PRICE);
    expect(html).not.toContain(FORBIDDEN_CENTS);

    // Card/detail primary price (sidebar/header)
    await expect(page.getByText(EXPECTED_PRICE, { exact: false }).first()).toBeVisible();

    // Spec labels: Romanian only for known aliases (post-hotfix)
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bCondition\b/);
    expect(body).not.toMatch(/\bHorsepower\b/);
    expect(body).not.toMatch(/\bCylinder Capacity\b/);
    expect(body).not.toMatch(/\bRegistration Date\b/);
    expect(body).not.toMatch(/\bAccidents\b/);
  });
});
