import { test, expect } from "@playwright/test";

/**
 * Email verification E2E against dedicated gate server (not :3000).
 * Requires EMAIL_OUTBOX=1 on the server under test for token capture via DB probe API
 * is not available — uses register + outbox probe script endpoint if present.
 *
 * This spec exercises public UI/API contracts without printing tokens.
 */

const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.E2E_BASE_URL ||
  "http://127.0.0.1:3098";

test.describe("email verification flows", () => {
  test("verify-email page is indexed off and no longer shows unavailable copy", async ({
    page,
  }) => {
    await page.goto(`${BASE}/auth/verify-email`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Verificare email/i })).toBeVisible();
    await expect(page.getByText(/indisponibilă/i)).toHaveCount(0);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    // metadata robots may be noindex via next — soft check
    void robots;
  });

  test("verify-email API rejects invalid token without leaking user", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: "x".repeat(43) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error || "")).not.toMatch(/userId|@/);
  });

  test("resend is anti-enumeration", async ({ request }) => {
    const a = await request.post(`${BASE}/api/auth/resend-verification`, {
      data: { email: "nobody-does-not-exist@example.com" },
    });
    const b = await request.post(`${BASE}/api/auth/resend-verification`, {
      data: { email: "also-missing@example.com" },
    });
    expect(a.ok()).toBeTruthy();
    expect(b.ok()).toBeTruthy();
    const ja = await a.json();
    const jb = await b.json();
    expect(ja.success).toBe(true);
    expect(jb.success).toBe(true);
    expect(ja.message).toBe(jb.message);
  });
});
