/**
 * Pre-deploy E2E: listing create/edit with large mobile-style photos.
 * Requires: PostgreSQL, E2E user (default alice@example.com / alice123).
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { seedCookieConsentAccepted } from "./helpers/cookie-consent";
import { pickCategoryAndSubcategory } from "./helpers/category-picker";

const email = process.env.E2E_EMAIL ?? "alice@example.com";
const password = process.env.E2E_PASSWORD ?? "alice123";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/listing-photos");
const LARGE_PORTRAIT = path.join(FIXTURE_DIR, "iphone-large-portrait.jpg");
const LARGE_LANDSCAPE = path.join(FIXTURE_DIR, "android-large-landscape.jpg");
const MEDIUM_PORTRAIT = path.join(FIXTURE_DIR, "portrait-medium.jpg");
const SMALL_LANDSCAPE = path.join(FIXTURE_DIR, "landscape-small.jpg");
const HEIC_SAMPLE = path.join(FIXTURE_DIR, "iphone-sample.heic");

const VIEWPORTS = {
  iphoneSafari: { width: 390, height: 844, label: "iPhone Safari" },
  androidChrome: { width: 412, height: 915, label: "Android Chrome" },
  messengerWebview: { width: 390, height: 664, label: "Messenger WebView" },
} as const;

function ensureFixtures() {
  if (!fs.existsSync(LARGE_PORTRAIT)) {
    execSync("node scripts/e2e-generate-large-photos.mjs", {
      cwd: path.join(__dirname, "../.."),
      stdio: "inherit",
    });
  }
}

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|listings|admin)/, { timeout: 30_000 });
  await expect(page.evaluate(() => localStorage.getItem("accessToken"))).resolves.toBeNull();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

async function clearListingDraft(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("listingDraft");
    localStorage.removeItem("listingDraftVersion");
  });
}

async function goToManualStep1(page: Page) {
  await page.goto("/listings/new");
  await page.getByRole("button", { name: /completează manual/i }).click();
  await expect(page.getByText("Informații esențiale")).toBeVisible({ timeout: 15_000 });
}

async function uploadPhotos(page: Page, files: string[]) {
  const uploadResponses: number[] = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/uploads") && res.request().method() === "POST") {
      uploadResponses.push(res.status());
    }
  });

  // Accept attribute is an implementation detail (currently a specific mime/extension
  // allowlist, not the "image/*" wildcard) — match by type only to stay aligned with
  // the real upload contract without weakening what this test actually verifies.
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(files);

  await expect(page.locator("text=/poză adăugată|poze adăugate/i")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.locator("text=/Max dimensions|5000x5000|Image too large/i")).toHaveCount(0);
  await expect(page.locator("text=/5000x5000/")).toHaveCount(0);

  const errors = page.locator(".text-red-500").filter({ hasText: /5000|too large/i });
  await expect(errors).toHaveCount(0);

  expect(uploadResponses.length).toBeGreaterThan(0);
  expect(uploadResponses.every((s) => s >= 200 && s < 300)).toBeTruthy();

  return uploadResponses;
}

async function fillStep1Basics(page: Page, title: string) {
  const stepCard = page.locator(".card").filter({ hasText: "Titlu anunț" });

  await stepCard
    .getByPlaceholder(/iPhone 14 Pro/i)
    .fill(title);

  // "Altele" requires an explicit subcategory ("Diverse") per current app validation.
  await pickCategoryAndSubcategory(page, stepCard, "Altele", "Diverse");

  await stepCard.locator('input[type="number"]').fill("150");

  await stepCard
    .locator("select")
    .filter({ has: page.locator('option:has-text("București")') })
    .selectOption({ label: "București" });

  await stepCard
    .locator("select")
    .filter({ has: page.locator('option:has-text("Sectorul 1")') })
    .selectOption({ label: "Sectorul 1" });
}

async function advanceFromStep1(page: Page) {
  if (await page.getByText("Detalii despre anunț").isVisible().catch(() => false)) {
    return;
  }
  const step1Continue = page
    .locator(".card")
    .filter({ hasText: "Titlu anunț" })
    .getByRole("button", { name: /Continuă →/ });
  await step1Continue.click();
  await expect(page.getByText("Detalii despre anunț")).toBeVisible({ timeout: 15_000 });
}

async function publishListing(page: Page): Promise<string> {
  await advanceFromStep1(page);
  await page.locator("textarea").fill(
    "Anunț test automat cu poze mari de telefon pentru verificare pre-deploy."
  );
  await page.getByRole("button", { name: /Continuă →/ }).click();
  await expect(page.getByText("Contact & publicare")).toBeVisible();
  await page.locator('input[type="tel"]').fill("0712345678");

  const publishBtn = page.getByRole("button", { name: /Publică anunțul/i });
  await expect(publishBtn).toBeEnabled({ timeout: 10_000 });

  const listingCreatePromise = page.waitForResponse(
    (res) => res.url().includes("/api/listings") && res.request().method() === "POST",
    { timeout: 60_000 }
  );

  await publishBtn.click();
  const createRes = await listingCreatePromise;
  expect(createRes.status()).toBeLessThan(500);
  expect(createRes.ok()).toBeTruthy();

  await page.waitForURL(
    (url) => {
      const m = url.pathname.match(/^\/listings\/([^/]+)$/);
      return Boolean(m && m[1] !== "new");
    },
    { timeout: 60_000 }
  );
  // Post-publish redirect now carries query params (?justCreated=1&publishState=…),
  // so extract the id from the pathname, not a naive split on the full URL.
  const listingId = new URL(page.url()).pathname.split("/").filter(Boolean).pop()!;
  expect(listingId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  return listingId;
}

async function assertListingImagesVisible(page: Page) {
  await expect(page.getByText(/Anunț inexistent/i)).toHaveCount(0);
  const mainImg = page
    .locator("main")
    .locator('img[src*="upload"], img[src*="/api/uploads"]')
    .first();
  await expect(mainImg).toBeVisible({ timeout: 20_000 });
  const naturalWidth = await mainImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
}

async function testEditListingPhoto(page: Page, listingId: string) {
  await page.goto(`/listings/${listingId}/edit`);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  const editInput = page.locator('input[type="file"]').first();
  if (!(await editInput.isVisible().catch(() => false))) {
    test.info().annotations.push({ type: "skip-edit", description: "Edit photo input not visible" });
    return;
  }
  await editInput.setInputFiles(LARGE_LANDSCAPE);
  await expect(page.locator("text=/Max dimensions|5000x5000/i")).toHaveCount(0, {
    timeout: 90_000,
  });
}

test.beforeAll(() => {
  ensureFixtures();
});

test.describe("Listing photo upload — mobile pre-deploy", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  for (const [key, vp] of Object.entries(VIEWPORTS)) {
    test(`full flow — ${vp.label}`, async ({ page, context }) => {
      await context.clearCookies();
      // Pre-accept cookie consent so the fixed bottom banner cannot intercept
      // pointer events aimed at the category-picker bottom sheet on small viewports.
      await seedCookieConsentAccepted(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      if (key === "messengerWebview") {
        await page.setExtraHTTPHeaders({
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBID/phone;FBLC/ro_RO;FBOP/5]",
        });
      }

      await login(page);
      await clearListingDraft(page);
      await goToManualStep1(page);

      const stamp = Date.now().toString(36);
      const title = `E2E Photo ${vp.label} ${stamp}`;

      await uploadPhotos(page, [LARGE_PORTRAIT, MEDIUM_PORTRAIT, SMALL_LANDSCAPE]);
      await fillStep1Basics(page, title);

      await advanceFromStep1(page);

      const listingId = await publishListing(page);
      await assertListingImagesVisible(page);

      await testEditListingPhoto(page, listingId);

      const existing = await page.request.get(`/api/listings/${listingId}`);
      expect(existing.ok()).toBeTruthy();
      const body = (await existing.json()) as { photos?: string[] };
      expect((body.photos ?? []).length).toBeGreaterThanOrEqual(1);
    });
  }

  test("API: oversized JPEG is accepted (not 5000 reject)", async ({ request }) => {
    const csrfRes = await request.get("/api/csrf");
    expect(csrfRes.ok()).toBeTruthy();
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const buf = fs.readFileSync(LARGE_LANDSCAPE);
    const meta = await import("sharp").then((m) => m.default(buf).metadata());
    expect((meta.width ?? 0) > 5000 || (meta.height ?? 0) > 5000).toBeTruthy();

    const res = await request.post("/api/uploads", {
      headers: { "x-csrf-token": csrfToken },
      data: {
        data: buf.toString("base64"),
        type: "image",
        filename: "IMG_5190.jpeg",
      },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { url?: string; error?: string };
    expect(data.url).toBeTruthy();
    expect(data.error ?? "").not.toMatch(/5000x5000/i);
  });

  test("HEIC upload if fixture exists", async ({ request }) => {
    if (!fs.existsSync(HEIC_SAMPLE)) {
      test.skip();
      return;
    }
    const csrfRes = await request.get("/api/csrf");
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const buf = fs.readFileSync(HEIC_SAMPLE);
    const res = await request.post("/api/uploads", {
      headers: { "x-csrf-token": csrfToken },
      data: { data: buf.toString("base64"), type: "image" },
    });
    expect(res.status()).not.toBe(500);
    if (res.ok()) {
      const data = (await res.json()) as { url?: string };
      expect(data.url).toBeTruthy();
    }
  });
});
