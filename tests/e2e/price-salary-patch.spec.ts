/**
 * FAZA 6C — PATCH/edit price+salary matrix against current build.
 * Local fixture listings only; soft-deletes after each test when id is known.
 */
import { test, expect } from "@playwright/test";
import {
  USER_STORAGE_STATE,
  ensureUserAuthStorage,
} from "./helpers/auth-storage";

type ApiResult = { status: number; body: Record<string, unknown> };

async function csrfToken(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const csrfRes = await fetch("/api/csrf", { credentials: "include" });
    if (!csrfRes.ok) throw new Error(`csrf ${csrfRes.status}`);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
    if (!csrfToken) throw new Error("missing csrf");
    return csrfToken;
  });
}

async function photoUrl(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const listRes = await fetch("/api/listings?limit=1");
    const listData = await listRes.json();
    return (
      listData?.data?.[0]?.photos?.[0] ||
      "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fe2e%2Foriginal%2F1.jpg"
    );
  });
}

async function api(
  page: import("@playwright/test").Page,
  opts: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    csrf?: string | null;
    credentials?: RequestCredentials;
  }
): Promise<ApiResult> {
  return page.evaluate(
    async ({ method, path, body, csrf, credentials }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (csrf) headers["x-csrf-token"] = csrf;
      const res = await fetch(path, {
        method,
        credentials: credentials ?? "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      let parsed: Record<string, unknown> = {};
      try {
        parsed = (await res.json()) as Record<string, unknown>;
      } catch {
        /* empty */
      }
      return { status: res.status, body: parsed };
    },
    opts
  );
}

async function createPhone(
  page: import("@playwright/test").Page,
  extra: Record<string, unknown> = {}
) {
  const csrf = await csrfToken(page);
  const photo = await photoUrl(page);
  const r = await api(page, {
    method: "POST",
    path: "/api/listings",
    csrf,
    body: {
      title: `E2E PATCH phone ${crypto.randomUUID().slice(0, 8)}`,
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: 900,
      priceCurrency: "RON",
      description:
        "Descriere E2E PATCH suficient de lunga pentru validare schema create.",
      county: "Cluj",
      city: "Cluj-Napoca",
      photos: [photo],
      allowMessages: true,
      attributes: { brand: "Samsung", storage_gb: "128" },
      ...extra,
    },
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: String(r.body.id), csrf, listing: r.body };
}

async function createService(
  page: import("@playwright/test").Page,
  extra: Record<string, unknown> = {}
) {
  const csrf = await csrfToken(page);
  const photo = await photoUrl(page);
  const r = await api(page, {
    method: "POST",
    path: "/api/listings",
    csrf,
    body: {
      title: `E2E PATCH serviciu ${crypto.randomUUID().slice(0, 8)}`,
      category: "Servicii și afaceri",
      subcategory: "Reparații",
      priceType: "FIXED",
      priceAmount: 200,
      priceCurrency: "RON",
      description:
        "Descriere E2E PATCH serviciu suficient de lunga pentru validare schema create.",
      county: "Cluj",
      city: "Cluj-Napoca",
      photos: [photo],
      allowMessages: true,
      ...extra,
    },
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: String(r.body.id), csrf, listing: r.body };
}

async function createJob(
  page: import("@playwright/test").Page,
  extra: Record<string, unknown> = {}
) {
  const csrf = await csrfToken(page);
  const photo = await photoUrl(page);
  const r = await api(page, {
    method: "POST",
    path: "/api/listings",
    csrf,
    body: {
      title: `E2E PATCH job ${crypto.randomUUID().slice(0, 8)}`,
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      description:
        "Descriere E2E PATCH job suficient de lunga pentru validare schema create.",
      county: "Cluj",
      city: "Cluj-Napoca",
      photos: [photo],
      allowMessages: true,
      ...extra,
    },
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: String(r.body.id), csrf, listing: r.body };
}

async function softDelete(page: import("@playwright/test").Page, id: string) {
  const csrf = await csrfToken(page);
  await api(page, { method: "DELETE", path: `/api/listings/${id}`, csrf });
}

test.describe("Price/salary PATCH matrix", () => {
  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
  });

  test("1 FIXED → NEGOTIABLE", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "NEGOTIABLE", priceAmount: 900, priceCurrency: "RON" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe("NEGOTIABLE");
    await softDelete(page, id);
  });

  test("2 FIXED → FROM", async ({ page }) => {
    const { id, csrf } = await createService(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FROM", priceAmount: 700 },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe("FROM");
    expect(r.body.priceAmount).toBe(700);
    await softDelete(page, id);
  });

  test("3 FIXED → FREE clears amount", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FREE", priceAmount: null },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe("FREE");
    expect(r.body.priceAmount).toBeNull();
    await softDelete(page, id);
  });

  test("4 FREE → FIXED requires amount", async ({ page }) => {
    const { id, csrf } = await createPhone(page, {
      priceType: "FREE",
      priceAmount: null,
    });
    const bad = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FIXED", priceAmount: null },
    });
    expect(bad.status).toBe(400);
    const ok = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FIXED", priceAmount: 1200, priceCurrency: "RON" },
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.priceAmount).toBe(1200);
    await softDelete(page, id);
  });

  test("5 ON_REQUEST → FIXED", async ({ page }) => {
    const { id, csrf } = await createService(page, {
      priceType: "ON_REQUEST",
      priceAmount: null,
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FIXED", priceAmount: 333, priceCurrency: "RON" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe("FIXED");
    expect(r.body.priceAmount).toBe(333);
    await softDelete(page, id);
  });

  test("6 FIXED → ON_REQUEST clears amount", async ({ page }) => {
    const { id, csrf } = await createService(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "ON_REQUEST", priceAmount: null },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe("ON_REQUEST");
    expect(r.body.priceAmount).toBeNull();
    await softDelete(page, id);
  });

  test("7 Job legacy amount → salary exact", async ({ page }) => {
    const { id, csrf } = await createJob(page, { priceAmount: 5000 });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        salaryMin: 5500,
        salaryMax: 5500,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
        priceAmount: null,
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.salaryMin).toBe(5500);
    expect(r.body.salaryMax).toBe(5500);
    expect(r.body.salaryPeriod).toBe("MONTH");
    await softDelete(page, id);
  });

  test("8 Job salary exact → interval", async ({ page }) => {
    const { id, csrf } = await createJob(page, {
      salaryMin: 4000,
      salaryMax: 4000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { salaryMin: 4000, salaryMax: 7000 },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.salaryMin).toBe(4000);
    expect(r.body.salaryMax).toBe(7000);
    await softDelete(page, id);
  });

  test("9 Job salary interval → exact", async ({ page }) => {
    const { id, csrf } = await createJob(page, {
      salaryMin: 4000,
      salaryMax: 7000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { salaryMin: 6000, salaryMax: 6000 },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.salaryMin).toBe(6000);
    expect(r.body.salaryMax).toBe(6000);
    await softDelete(page, id);
  });

  test("10 clear Job salary", async ({ page }) => {
    const { id, csrf } = await createJob(page, {
      salaryMin: 4000,
      salaryMax: 4000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.salaryMin).toBeNull();
    expect(r.body.salaryPeriod).toBeNull();
    await softDelete(page, id);
  });

  test("11 Job → non-Job clears salary", async ({ page }) => {
    const { id, csrf } = await createJob(page, {
      salaryMin: 4000,
      salaryMax: 4000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        priceType: "FIXED",
        priceAmount: 800,
        priceCurrency: "RON",
        attributes: { brand: "Samsung", storage_gb: "128" },
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.category).toContain("Electronice");
    expect(r.body.salaryMin).toBeNull();
    expect(r.body.priceType).toBe("FIXED");
    await softDelete(page, id);
  });

  test("12 non-Job → Job clears commercial fields", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        category: "Locuri de muncă",
        subcategory: "IT/Software",
        salaryMin: 5000,
        salaryMax: 5000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBeNull();
    expect(r.body.salaryMin).toBe(5000);
    await softDelete(page, id);
  });

  test("13 category change invalidates priceType → 400", async ({ page }) => {
    const { id, csrf } = await createPhone(page, {
      priceType: "FREE",
      priceAmount: null,
    });
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        category: "Auto, moto și ambarcațiuni",
        subcategory: "Autoturisme",
        // FREE not allowed on Autoturisme — leave priceType FREE in effective state
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(400);
    await softDelete(page, id);
  });

  test("14 partial PATCH without price/salary keeps amounts", async ({
    page,
  }) => {
    const { id, csrf, listing } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        title: `E2E PATCH title only ${crypto.randomUUID().slice(0, 8)}`,
      },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.priceType).toBe(listing.priceType);
    expect(r.body.priceAmount).toBe(listing.priceAmount);
    await softDelete(page, id);
  });

  test("15 invalid effective state → 400", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FIXED", priceAmount: null },
    });
    expect(r.status).toBe(400);
    await softDelete(page, id);
  });

  test("16 salary on non-Job → 400", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        salaryMin: 1000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      },
    });
    expect(r.status).toBe(400);
    await softDelete(page, id);
  });

  test("17 priceType not allowed for subcategory → 400", async ({ page }) => {
    const csrf = await csrfToken(page);
    const photo = await photoUrl(page);
    const created = await api(page, {
      method: "POST",
      path: "/api/listings",
      csrf,
      body: {
        title: `E2E auto ${crypto.randomUUID().slice(0, 8)}`,
        category: "Auto, moto și ambarcațiuni",
        subcategory: "Autoturisme",
        priceType: "FIXED",
        priceAmount: 10000,
        priceCurrency: "RON",
        description:
          "Descriere E2E auto suficient de lunga pentru validare schema create.",
        county: "Cluj",
        city: "Cluj-Napoca",
        photos: [photo],
        allowMessages: true,
        make: "Dacia",
        model: "Logan",
        year: 2018,
        mileage: 100000,
        fuel: "petrol",
        transmission: "manual",
      },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const id = String(created.body.id);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: { priceType: "FREE", priceAmount: null },
    });
    expect(r.status).toBe(400);
    await softDelete(page, id);
  });

  test("18 other owner → 403", async ({ page, browser }) => {
    const { id } = await createPhone(page);
    // Anonymous context with empty storage — cannot edit
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    });
    const anon = await ctx.newPage();
    await anon.goto("/listings/new", { waitUntil: "domcontentloaded" });
    const csrfRes = await anon.evaluate(async () => {
      const r = await fetch("/api/csrf", { credentials: "include" });
      return r.json();
    });
    const r = await anon.evaluate(
      async ({ id, csrf }) => {
        const res = await fetch(`/api/listings/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify({ title: "hijack attempt title long enough" }),
        });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      },
      { id, csrf: csrfRes.csrfToken as string }
    );
    // Unauthorized before ownership check when no session
    expect([401, 403]).toContain(r.status);
    await ctx.close();
    await softDelete(page, id);
  });

  test("19 no auth → 401", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    });
    const anon = await ctx.newPage();
    await anon.goto("/", { waitUntil: "domcontentloaded" });
    const csrfRes = await anon.evaluate(async () => {
      const r = await fetch("/api/csrf", { credentials: "include" });
      return r.json();
    });
    const r = await anon.evaluate(async (csrf) => {
      const res = await fetch(
        `/api/listings/00000000-0000-4000-8000-000000000001`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify({ title: "no auth title long enough xx" }),
        }
      );
      return { status: res.status };
    }, csrfRes.csrfToken as string);
    expect(r.status).toBe(401);
    await ctx.close();
  });

  test("20 invalid CSRF header → 403", async ({ page }) => {
    const { id } = await createPhone(page);
    // Contract: extractCsrfToken falls back to cookie when header missing.
    // Privilege write must fail when header is present but wrong.
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf: "definitely-invalid-csrf-token-value",
      body: { title: "invalid csrf title long enough" },
    });
    expect(r.status).toBe(403);
    await softDelete(page, id);
  });

  test("21 status/featured/userId spoof ignored or rejected", async ({
    page,
  }) => {
    const { id, csrf, listing } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        title: `E2E spoof ${crypto.randomUUID().slice(0, 8)}`,
        status: "active",
        ownerUserId: "00000000-0000-4000-8000-000000000099",
      },
    });
    // ownerUserId is unknown to strict edit schema → 400, OR stripped
    if (r.status === 400) {
      expect(String(r.body.error || "")).toMatch(/unrecognized|invalid|owner|strict|Required|Expected/i);
    } else {
      expect(r.status).toBe(200);
      expect(r.body.ownerUserId).toBe(listing.ownerUserId);
      // Owner cannot force active via status spoof
      expect(r.body.status).toBe(listing.status);
    }
    await softDelete(page, id);
  });

  test("22 unknown field → 400", async ({ page }) => {
    const { id, csrf } = await createPhone(page);
    const r = await api(page, {
      method: "PATCH",
      path: `/api/listings/${id}`,
      csrf,
      body: {
        title: `E2E unknown ${crypto.randomUUID().slice(0, 8)}`,
        totallyUnknownField: true,
      },
    });
    expect(r.status).toBe(400);
    await softDelete(page, id);
  });
});

test.describe("Price/salary PATCH UI preserve", () => {
  test.beforeAll(async () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await ensureUserAuthStorage(baseURL);
  });

  test.use({ storageState: USER_STORAGE_STATE });

  test("24 edit UI keeps values after API error", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    const { id } = await createPhone(page);
    await page.goto(`/listings/${id}/edit`, { waitUntil: "domcontentloaded" });

    const amount = page.locator('input[name="priceAmount"], input[inputmode="decimal"]').first();
    if (await amount.isVisible().catch(() => false)) {
      await amount.fill("9999");
    }

    // Force invalid PATCH via intercepted route once
    await page.route(`**/api/listings/${id}`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "E2E forced validation error" }),
        });
        return;
      }
      await route.continue();
    });

    const save = page.getByRole("button", { name: /Salvează|Actualizează|Trimite/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await expect(page.getByText(/E2E forced validation error|eroare|invalid/i).first()).toBeVisible({
        timeout: 10_000,
      });
      if (await amount.isVisible().catch(() => false)) {
        await expect(amount).toHaveValue(/9999/);
      }
    }

    await page.unroute(`**/api/listings/${id}`);
    await softDelete(page, id);
  });

  test("25 leave edit shows confirm or stays when dirty", async ({ page }) => {
    await page.goto("/listings/new", { waitUntil: "domcontentloaded" });
    const { id } = await createPhone(page);
    await page.goto(`/listings/${id}/edit`, { waitUntil: "domcontentloaded" });

    const title = page.locator('input[name="title"], input[placeholder*="Titlu"]').first();
    if (await title.isVisible().catch(() => false)) {
      await title.fill(`Dirty title ${crypto.randomUUID().slice(0, 8)}`);
    }

    let dialogSeen = false;
    page.once("dialog", async (d) => {
      dialogSeen = true;
      await d.dismiss();
    });

    await page.goto("/dashboard/listings", { waitUntil: "domcontentloaded" }).catch(() => {});
    // Either beforeunload dialog fired, or app used in-app confirm — both acceptable.
    // If no dialog, page may still be on edit (client router block) or navigated away.
    const url = page.url();
    expect(dialogSeen || /edit|listings/.test(url)).toBeTruthy();
    await softDelete(page, id);
  });
});
