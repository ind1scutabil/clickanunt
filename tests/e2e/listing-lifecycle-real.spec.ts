/**
 * FAZA 11B — real owner lifecycle against local dedicated server.
 * Creates a listing via API, exercises deactivate/reactivate/soft-delete.
 * No Stripe LIVE / no real charges.
 */
import { test, expect } from "@playwright/test";
import {
  USER_STORAGE_STATE,
  ADMIN_STORAGE_STATE,
  ensureUserAuthStorage,
  ensureAdminAuthStorage,
} from "./helpers/auth-storage";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

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

async function postListing(page: import("@playwright/test").Page, payload: Record<string, unknown>) {
  const prep = await csrfAndPhoto(page);
  if (!prep.ok) return { status: prep.status, body: { error: prep.step } };
  return page.evaluate(
    async ({ csrfToken, photo, payload }) => {
      const body = {
        ...payload,
        photos: (payload.photos as string[] | undefined) || [photo],
        description:
          (payload.description as string) ||
          "Descriere E2E lifecycle suficient de lunga pentru validare schema publish.",
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

async function patchListing(
  page: import("@playwright/test").Page,
  id: string,
  body: Record<string, unknown>
) {
  const prep = await csrfAndPhoto(page);
  if (!prep.ok) return { status: prep.status, body: {} };
  return page.evaluate(
    async ({ csrfToken, id, body }) => {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
    { csrfToken: prep.csrfToken, id, body }
  );
}

test.describe("Listing lifecycle real API", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async () => {
    await ensureUserAuthStorage(baseURL);
    await ensureAdminAuthStorage(baseURL);
  });

  test("owner deactivate → public gone → reactivate pending → admin approve → soft-delete", async ({
    browser,
  }) => {
    const userCtx = await browser.newContext({ storageState: USER_STORAGE_STATE });
    const userPage = await userCtx.newPage();
    await userPage.goto("/listings/new", { waitUntil: "domcontentloaded" });

    const created = await postListing(userPage, {
      title: `E2E lifecycle ${crypto.randomUUID().slice(0, 8)}`,
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: 99900,
      priceCurrency: "RON",
      attributes: { brand: "Samsung", storage_gb: "128" },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const listingId = String(created.body.id || "");
    expect(listingId).toMatch(/^[0-9a-f-]{36}$/i);

    let status = String(created.body.status || "");
    if (status === "pending") {
      const adminCtx = await browser.newContext({ storageState: ADMIN_STORAGE_STATE });
      const adminPage = await adminCtx.newPage();
      await adminPage.goto("/admin/moderation", { waitUntil: "domcontentloaded" });
      const prep = await csrfAndPhoto(adminPage);
      expect(prep.ok).toBe(true);
      if (prep.ok) {
        const patch = await adminPage.evaluate(
          async ({ id, csrfToken }) => {
            const res = await fetch(`/api/admin/listings/${id}`, {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "x-csrf-token": csrfToken,
              },
              body: JSON.stringify({ status: "active" }),
            });
            return { status: res.status, body: await res.json() };
          },
          { id: listingId, csrfToken: prep.csrfToken }
        );
        expect(patch.status).toBe(200);
        status = "active";
      }
      await adminCtx.close();
    }

    if (status === "active") {
      const anonCtx = await browser.newContext();
      const pubOk = await anonCtx.request.get(`/api/listings/${listingId}`);
      expect(pubOk.status()).toBe(200);
      await anonCtx.close();
    }

    const paused = await patchListing(userPage, listingId, { status: "paused" });
    expect(paused.status, JSON.stringify(paused.body)).toBe(200);
    expect(paused.body.status).toBe("paused");

    const anonAfterPause = await browser.newContext();
    expect((await anonAfterPause.request.get(`/api/listings/${listingId}`)).status()).toBe(404);
    await anonAfterPause.close();

    const pending = await patchListing(userPage, listingId, { status: "pending" });
    expect(pending.status, JSON.stringify(pending.body)).toBe(200);
    expect(pending.body.status).toBe("pending");

    const anonPending = await browser.newContext();
    expect((await anonPending.request.get(`/api/listings/${listingId}`)).status()).toBe(404);
    await anonPending.close();

    const adminCtx = await browser.newContext({ storageState: ADMIN_STORAGE_STATE });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto("/admin/moderation", { waitUntil: "domcontentloaded" });
    const prepAdmin = await csrfAndPhoto(adminPage);
    expect(prepAdmin.ok).toBe(true);
    if (prepAdmin.ok) {
      const approved = await adminPage.evaluate(
        async ({ id, csrfToken }) => {
          const res = await fetch(`/api/admin/listings/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ status: "active" }),
          });
          return { status: res.status, body: await res.json() };
        },
        { id: listingId, csrfToken: prepAdmin.csrfToken }
      );
      expect(approved.status).toBe(200);
    }
    const anonActive = await browser.newContext();
    expect((await anonActive.request.get(`/api/listings/${listingId}`)).status()).toBe(200);
    await anonActive.close();

    // Status spoof
    const spoof = await patchListing(userPage, listingId, { status: "active" });
    expect(spoof.status).toBe(400);

    // Soft-delete owner
    const prepDel = await csrfAndPhoto(userPage);
    expect(prepDel.ok).toBe(true);
    if (prepDel.ok) {
      const deleted = await userPage.evaluate(
        async ({ id, csrfToken }) => {
          const res = await fetch(`/api/listings/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: { "x-csrf-token": csrfToken },
          });
          return res.status;
        },
        { id: listingId, csrfToken: prepDel.csrfToken }
      );
      expect(deleted).toBe(200);
    }
    const anonDeleted = await browser.newContext();
    expect((await anonDeleted.request.get(`/api/listings/${listingId}`)).status()).toBe(404);
    await anonDeleted.close();

    await adminCtx.close();
    await userCtx.close();
  });

  test("public list endpoint stays healthy", async ({ request }) => {
    const res = await request.get("/api/listings?limit=1&status=active");
    expect(res.status()).toBeLessThan(500);
  });
});
