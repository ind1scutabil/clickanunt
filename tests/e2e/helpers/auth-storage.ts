/**
 * Build Playwright storageState for a normal user via API (one login, no UI spam).
 * Writes localStorage accessToken/user to match the app's client session.
 */
import { request as playwrightRequest } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

export const USER_STORAGE_STATE = path.resolve(__dirname, "../.auth/user.json");
export const ADMIN_STORAGE_STATE = path.resolve(__dirname, "../.auth/admin.json");

async function writeAuthStorage(opts: {
  baseURL: string;
  email: string;
  password: string;
  outPath: string;
}) {
  const ctx = await playwrightRequest.newContext({ baseURL: opts.baseURL });
  const csrfRes = await ctx.get("/api/csrf");
  if (!csrfRes.ok()) throw new Error(`csrf ${csrfRes.status()}`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) throw new Error("missing csrf");

  const loginRes = await ctx.post("/api/auth/login", {
    data: { email: opts.email, password: opts.password },
    headers: { "x-csrf-token": csrfToken },
  });
  const loginData = await loginRes.json();
  if (loginRes.status() === 206) {
    throw new Error("2FA required — use non-2FA fixture user");
  }
  if (loginRes.status() !== 200) {
    throw new Error(`login failed ${loginRes.status()}: ${JSON.stringify(loginData)}`);
  }

  const storageState = await ctx.storageState();
  await ctx.dispose();

  const origin = new URL(opts.baseURL).origin;
  storageState.origins = storageState.origins || [];
  let target = storageState.origins.find((o) => o.origin === origin);
  if (!target) {
    target = { origin, localStorage: [] };
    storageState.origins.push(target);
  }

  const setItem = (name: string, value: string | undefined) => {
    if (!value) return;
    const i = target!.localStorage.findIndex((x) => x.name === name);
    const entry = { name, value };
    if (i >= 0) target!.localStorage[i] = entry;
    else target!.localStorage.push(entry);
  };

  if (loginData.user) setItem("user", JSON.stringify(loginData.user));
  setItem("accessToken", loginData.accessToken);
  setItem("refreshToken", loginData.refreshToken);

  await fs.mkdir(path.dirname(opts.outPath), { recursive: true });
  await fs.writeFile(opts.outPath, JSON.stringify(storageState, null, 2), "utf-8");
  return opts.outPath;
}

export async function ensureUserAuthStorage(baseURL: string): Promise<string> {
  const email = process.env.E2E_USER_EMAIL ?? process.env.E2E_EMAIL ?? "user@example.com";
  const password =
    process.env.E2E_USER_PASSWORD ?? process.env.E2E_PASSWORD ?? "Password123!";
  return writeAuthStorage({ baseURL, email, password, outPath: USER_STORAGE_STATE });
}

export async function ensureAdminAuthStorage(baseURL: string): Promise<string> {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@clickanunt.ro";
  const password =
    process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123";
  return writeAuthStorage({ baseURL, email, password, outPath: ADMIN_STORAGE_STATE });
}
