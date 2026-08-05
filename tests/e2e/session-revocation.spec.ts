/**
 * Cookie-first web + sessionVersion revocation across two browser contexts.
 * Run twice consecutively on dedicated gate port (not :3000).
 */
import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

const strongPassword = "Password123!";
const nextPassword = "Password456!";

async function csrf(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/csrf");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { csrfToken?: string };
  expect(data.csrfToken).toBeTruthy();
  return data.csrfToken!;
}

async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const token = await csrf(request);
  const res = await request.post("/api/auth/register", {
    data: {
      email,
      password,
      confirmPassword: password,
      name: "SV E2E",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    headers: { "x-csrf-token": token },
  });
  const body = (await res.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: { id?: string };
    error?: string;
  };
  expect(res.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(200);
  expect(res.status(), JSON.stringify(body)).toBeLessThan(300);
  expect(body.accessToken).toBeUndefined();
  expect(body.refreshToken).toBeUndefined();
  return body.user;
}

async function loginViaApi(
  ctx: BrowserContext,
  email: string,
  password: string
) {
  const token = await csrf(ctx.request);
  const res = await ctx.request.post("/api/auth/login", {
    data: { email, password },
    headers: { "x-csrf-token": token },
  });
  const body = (await res.json()) as {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  };
  expect(res.status(), JSON.stringify(body)).toBe(200);
  expect(body.accessToken).toBeUndefined();
  expect(body.refreshToken).toBeUndefined();
}

test.describe("Session revocation + no localStorage JWT", () => {
  test("two devices: password change revokes other session", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const email = `sv-revoke-${Date.now()}@example.com`;

    const bootstrap = await browser.newContext();
    await registerViaApi(bootstrap.request, email, strongPassword);
    await bootstrap.close();

    const deviceA = await browser.newContext();
    const deviceB = await browser.newContext();
    await loginViaApi(deviceA, email, strongPassword);
    await loginViaApi(deviceB, email, strongPassword);

    const pageA = await deviceA.newPage();
    await pageA.goto("/dashboard");
    await expect(pageA).not.toHaveURL(/\/auth\/login/);
    const lsA = await pageA.evaluate(() => ({
      access: localStorage.getItem("accessToken"),
      refresh: localStorage.getItem("refreshToken"),
    }));
    expect(lsA.access).toBeNull();
    expect(lsA.refresh).toBeNull();
    const cookiesA = await deviceA.cookies();
    expect(
      cookiesA.some((c) => c.name === "accessToken" && c.httpOnly)
    ).toBeTruthy();

    const meBBefore = await deviceB.request.get("/api/users/me");
    expect(meBBefore.status()).toBe(200);

    const changeRes = await deviceA.request.post("/api/auth/change-password", {
      data: {
        currentPassword: strongPassword,
        newPassword: nextPassword,
        confirmPassword: nextPassword,
      },
      headers: { "x-csrf-token": await csrf(deviceA.request) },
    });
    expect(changeRes.status(), await changeRes.text()).toBe(200);

    const meAAfter = await deviceA.request.get("/api/users/me");
    expect(meAAfter.status(), "device A remains authenticated").toBe(200);

    const meBAfter = await deviceB.request.get("/api/users/me");
    expect(meBAfter.status(), "device B access revoked").toBe(401);

    const refreshB = await deviceB.request.post("/api/auth/refresh", {
      data: {},
      headers: { "x-csrf-token": await csrf(deviceB.request) },
    });
    expect(refreshB.status(), "device B refresh revoked").toBe(401);

    await deviceA.close();
    await deviceB.close();
  });

  test("login leaves no auth JWT in localStorage or sessionStorage", async ({
    page,
    context,
    baseURL,
  }) => {
    const email = `sv-ls-${Date.now()}@example.com`;
    await registerViaApi(context.request, email, strongPassword);
    await page.goto(`${baseURL}/auth/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', strongPassword);
    await page.getByRole("button", { name: /Conectează-te/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    const storage = await page.evaluate(() => {
      const lsKeys = Object.keys(localStorage);
      const ssKeys = Object.keys(sessionStorage);
      return {
        lsKeys,
        ssKeys,
        access: localStorage.getItem("accessToken"),
        refresh: localStorage.getItem("refreshToken"),
        ssAccess: sessionStorage.getItem("accessToken"),
      };
    });
    expect(storage.access).toBeNull();
    expect(storage.refresh).toBeNull();
    expect(storage.ssAccess).toBeNull();
    expect(storage.lsKeys.filter((k) => /token/i.test(k))).toEqual([]);

    const cookies = await context.cookies();
    const access = cookies.find((c) => c.name === "accessToken");
    expect(access?.httpOnly).toBe(true);
  });
});
