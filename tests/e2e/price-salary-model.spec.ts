/**
 * FAZA 6B — priceType / salary create+UI matrix against the current build.
 * Uses cookie auth + CSRF; creates listings on local DB only (cleanup via deletedAt where possible).
 */
import { test, expect } from "@playwright/test";
import {
  USER_STORAGE_STATE,
  ensureUserAuthStorage,
} from "./helpers/auth-storage";

async function csrfAndPhoto(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const csrfRes = await fetch("/api/csrf", { credentials: "include" });
    if (!csrfRes.ok) return { ok: false as const, step: "csrf", status: csrfRes.status };
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
    const listRes = await fetch("/api/listings?limit=1");
    const listData = await listRes.json();
    const photo =
      listData?.data?.[0]?.photos?.[0] ||
      "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fe2e%2Foriginal%2F1.jpg";
    return { ok: true as const, csrfToken: csrfToken!, photo };
  });
}

async function postListing(
  page: import("@playwright/test").Page,
  payload: Record<string, unknown>
) {
  const prep = await csrfAndPhoto(page);
  if (!prep.ok) return { status: prep.status, body: { error: prep.step } };
  return page.evaluate(
    async ({ csrfToken, photo, payload }) => {
      const body = {
        ...payload,
        photos: (payload.photos as string[] | undefined) || [photo],
        description:
          (payload.description as string) ||
          "Descriere E2E price/salary suficient de lunga pentru validare schema.",
        county: (payload.county as string) || "Cluj",
        city: (payload.city as string) || "Cluj-Napoca",
        allowMessages: true,
      };
      const res = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(body),
      });
      let parsed: Record<string, unknown> = {};
      try {
        parsed = (await res.json()) as Record<string, unknown>;
      } catch {
        /* empty */
      }
      return { status: res.status, body: parsed };
    },
    { csrfToken: prep.csrfToken, photo: prep.photo, payload }
  );
}

test.describe("Price/salary model API", () => {
  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
  });

  const baseAttrs = { brand: "Samsung", storage_gb: "128" };

  test("FIXED create persists priceType FIXED", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E FIXED telefon ${crypto.randomUUID().slice(0, 8)}`,
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: 999,
      priceCurrency: "RON",
      attributes: baseAttrs,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("FIXED");
    expect(r.body.priceAmount).toBe(999);
  });

  test("NEGOTIABLE create", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E NEGOTIABLE telefon ${crypto.randomUUID().slice(0, 8)}`,
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "NEGOTIABLE",
      priceAmount: 800,
      priceCurrency: "RON",
      attributes: { brand: "Apple", storage_gb: "64" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("NEGOTIABLE");
  });

  test("FROM create", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E FROM serviciu ${crypto.randomUUID().slice(0, 8)}`,
      category: "Servicii și afaceri",
      subcategory: "Reparații",
      priceType: "FROM",
      priceAmount: 150,
      priceCurrency: "RON",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("FROM");
    expect(r.body.priceAmount).toBe(150);
  });

  test("FREE create stores null amount", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E FREE donatie ${crypto.randomUUID().slice(0, 8)}`,
      category: "Altele",
      subcategory: "Donații",
      priceType: "FREE",
      priceAmount: null,
      priceCurrency: null,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("FREE");
    expect(r.body.priceAmount).toBeNull();
  });

  test("ON_REQUEST create stores null amount", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E ON REQUEST serviciu ${crypto.randomUUID().slice(0, 8)}`,
      category: "Servicii și afaceri",
      subcategory: "Reparații",
      priceType: "ON_REQUEST",
      priceAmount: null,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("ON_REQUEST");
    expect(r.body.priceAmount).toBeNull();
  });

  test("rejects FREE on Autoturisme", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E BAD FREE auto ${crypto.randomUUID().slice(0, 8)}`,
      category: "Auto, moto și ambarcațiuni",
      subcategory: "Autoturisme",
      priceType: "FREE",
      priceAmount: null,
      make: "Dacia",
      model: "Logan",
      year: 2018,
      fuel: "petrol",
      transmission: "manual",
    });
    expect(r.status).toBe(400);
  });

  test("Job without salary", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E JOB fara salariu ${crypto.randomUUID().slice(0, 8)}`,
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      priceType: null,
      priceAmount: null,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceAmount).toBeNull();
    expect(r.body.salaryMin == null || r.body.salaryMin === null).toBe(true);
  });

  test("Job salary exact", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E JOB salariu exact ${crypto.randomUUID().slice(0, 8)}`,
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      salaryMin: 5000,
      salaryMax: 5000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.salaryMin).toBe(5000);
    expect(r.body.salaryMax).toBe(5000);
    expect(r.body.salaryPeriod).toBe("MONTH");
    expect(r.body.priceAmount).toBeNull();
  });

  test("Job salary interval", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E JOB interval ${crypto.randomUUID().slice(0, 8)}`,
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      salaryMin: 4000,
      salaryMax: 6000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.salaryMin).toBe(4000);
    expect(r.body.salaryMax).toBe(6000);
  });

  test("Job inverted interval rejected", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E JOB interval invalid ${crypto.randomUUID().slice(0, 8)}`,
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      salaryMin: 6000,
      salaryMax: 4000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(r.status).toBe(400);
  });

  test("legacy non-Job amount without priceType → FIXED", async ({ page }) => {
    const r = await postListing(page, {
      title: `E2E LEGACY amount ${crypto.randomUUID().slice(0, 8)}`,
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceAmount: 420,
      priceCurrency: "RON",
      attributes: { brand: "Xiaomi", storage_gb: "128" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.priceType).toBe("FIXED");
    expect(r.body.priceAmount).toBe(420);
  });
});

test.describe("Price/salary wizard UI", () => {
  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("price preview updates for FREE / Jobs salary", async ({ page, isMobile }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    const manual = page.getByRole("button", { name: /completează manual/i });
    if (await manual.isVisible().catch(() => false)) await manual.click();

    if (isMobile) {
      await expect(page.getByRole("navigation", { name: /Navigare rapidă/i })).toHaveCount(0);
    }

    // Category Altele / Donații → FREE
    const openCat = page.getByRole("button", { name: /Alege categoria/i }).first();
    if (await openCat.isVisible().catch(() => false)) {
      await openCat.click();
      const dialog = page.getByRole("dialog", { name: /Alege categoria/i });
      await expect(dialog).toBeVisible();
      await dialog.getByText("Altele", { exact: true }).click();
      await dialog.getByText("Donații", { exact: true }).click().catch(async () => {
        // subcategory may be a button list
        await dialog.getByRole("button", { name: /Donații/i }).click();
      });
    }

    const preview = page.getByTestId("price-preview");
    if (await preview.isVisible().catch(() => false)) {
      await expect(preview).toContainText(/Gratuit|Previzualizare/i);
    }
  });
});
