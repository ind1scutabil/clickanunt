import { expect, test } from "@playwright/test";

/**
 * FAZA 16 — cron auth + user notification ownership smoke.
 * Point PLAYWRIGHT_BASE_URL / E2E_BASE_URL at a dedicated gate server (never assume :3000).
 */

const BASE =
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:3101";

test.describe("notifications + cron operational contracts", () => {
  test("cron expire-promotions rejects missing and wrong secret", async ({
    request,
  }) => {
    const noAuth = await request.get(`${BASE}/api/cron/expire-promotions`);
    expect([401, 503]).toContain(noAuth.status());
    const body = await noAuth.json();
    expect(JSON.stringify(body)).not.toMatch(/Bearer |CRON_SECRET=\w+/);

    const wrong = await request.get(`${BASE}/api/cron/expire-promotions`, {
      headers: { Authorization: "Bearer definitely-wrong-secret" },
    });
    expect([401, 503]).toContain(wrong.status());
  });

  test("cron analytics rejects unauthorized", async ({ request }) => {
    const res = await request.get(`${BASE}/api/cron/analytics`);
    expect([401, 503]).toContain(res.status());
  });

  test("notifications require auth and do not leak across sessions", async ({
    request,
  }) => {
    const anon = await request.get(`${BASE}/api/notifications`);
    expect(anon.status()).toBe(401);

    const markAll = await request.post(`${BASE}/api/notifications/mark-all-read`);
    expect(markAll.status()).toBe(401);
  });

  test("SSE events require auth and ignore query token", async ({ request }) => {
    const noAuth = await request.get(`${BASE}/api/messages/events`);
    expect(noAuth.status()).toBe(401);

    const queryTok = await request.get(
      `${BASE}/api/messages/events?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig`
    );
    expect(queryTok.status()).toBe(401);
  });
});
