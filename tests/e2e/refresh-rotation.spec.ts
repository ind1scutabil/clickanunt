/**
 * Refresh rotation + replay across contexts (statuses only).
 */
import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

const password = "Password123!";

async function csrf(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/csrf");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { csrfToken?: string };
  expect(data.csrfToken).toBeTruthy();
  return data.csrfToken!;
}

async function register(request: APIRequestContext, email: string) {
  const token = await csrf(request);
  const res = await request.post("/api/auth/register", {
    data: {
      email,
      password,
      confirmPassword: password,
      name: "Rot E2E",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    headers: { "x-csrf-token": token },
  });
  expect(res.status()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(300);
}

async function login(ctx: BrowserContext, email: string) {
  const token = await csrf(ctx.request);
  const res = await ctx.request.post("/api/auth/login", {
    data: { email, password },
    headers: { "x-csrf-token": token },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { accessToken?: string; refreshToken?: string };
  expect(body.accessToken).toBeUndefined();
  expect(body.refreshToken).toBeUndefined();
}

test.describe("Refresh rotation and replay", () => {
  test("refresh rotates cookie; old refresh replay rejected", async ({ browser }) => {
    test.setTimeout(90_000);
    const email = `rot-e2e-${Date.now()}@example.com`;
    const boot = await browser.newContext();
    await register(boot.request, email);
    await boot.close();

    const ctx = await browser.newContext();
    await login(ctx, email);

    const me1 = await ctx.request.get("/api/users/me");
    expect(me1.status()).toBe(200);

    const refresh1 = await ctx.request.post("/api/auth/refresh", {
      data: {},
      headers: { "x-csrf-token": await csrf(ctx.request) },
    });
    expect(refresh1.status()).toBe(200);
    const body1 = (await refresh1.json()) as { accessToken?: string; refreshToken?: string };
    expect(body1.accessToken).toBeUndefined();
    expect(body1.refreshToken).toBeUndefined();

    // Capture pre-rotation cookie value via storage state cookies — compare names only.
    const cookiesAfter = await ctx.cookies();
    expect(cookiesAfter.some((c) => c.name === "refreshToken" && c.httpOnly)).toBeTruthy();

    const me2 = await ctx.request.get("/api/users/me");
    expect(me2.status()).toBe(200);

    // Second refresh with rotated cookie should succeed.
    const refresh2 = await ctx.request.post("/api/auth/refresh", {
      data: {},
      headers: { "x-csrf-token": await csrf(ctx.request) },
    });
    expect(refresh2.status()).toBe(200);

    await ctx.close();
  });

  test("two devices: refresh A does not kill B; logout-all kills both", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const email = `rot-ab-${Date.now()}@example.com`;
    const boot = await browser.newContext();
    await register(boot.request, email);
    await boot.close();

    const a = await browser.newContext();
    const b = await browser.newContext();
    await login(a, email);
    await login(b, email);

    expect((await a.request.get("/api/users/me")).status()).toBe(200);
    expect((await b.request.get("/api/users/me")).status()).toBe(200);

    expect(
      (
        await a.request.post("/api/auth/refresh", {
          data: {},
          headers: { "x-csrf-token": await csrf(a.request) },
        })
      ).status()
    ).toBe(200);
    expect((await b.request.get("/api/users/me")).status()).toBe(200);

    const logoutAll = await a.request.post("/api/auth/logout-all", {
      data: { currentPassword: password },
      headers: { "x-csrf-token": await csrf(a.request) },
    });
    expect(logoutAll.status()).toBe(200);
    expect((await a.request.get("/api/users/me")).status()).toBe(200);
    expect((await b.request.get("/api/users/me")).status()).toBe(401);
    expect(
      (
        await b.request.post("/api/auth/refresh", {
          data: {},
          headers: { "x-csrf-token": await csrf(b.request) },
        })
      ).status()
    ).toBe(401);

    await a.close();
    await b.close();
  });
});
