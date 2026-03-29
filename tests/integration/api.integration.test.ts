/**
 * Integrare API — necesită server Next + DB (ex.: npm run dev).
 *
 * Rulare: npm run test:integration
 * Opțional: API_URL=http://127.0.0.1:3000 npm run test:integration
 *
 * @jest-environment node
 */
import { createCsrfSession } from "./helpers/csrf-session";

const baseUrl = (process.env.API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function url(path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

describe("API integration (server required)", () => {
  it("GET /api/health returns 200", async () => {
    const res = await fetch(url("/api/health"));
    expect(res.status).toBe(200);
  });

  it("GET /api/listings returns 200", async () => {
    const res = await fetch(url("/api/listings"));
    expect(res.status).toBe(200);
  });

  it("GET /api/users/me without auth returns 401", async () => {
    const res = await fetch(url("/api/users/me"));
    expect(res.status).toBe(401);
  });

  it("GET /api/messages/conversations without auth returns 401", async () => {
    const res = await fetch(url("/api/messages/conversations"));
    expect(res.status).toBe(401);
  });

  it("GET /api/listings/:id with unknown UUID returns 404", async () => {
    const id = "00000000-0000-4000-8000-000000000099";
    const res = await fetch(url(`/api/listings/${id}`));
    expect(res.status).toBe(404);
  });

  it("GET /api/admin/moderation/queue without admin returns 403", async () => {
    const res = await fetch(url("/api/admin/moderation/queue"));
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/moderation/:id/approve without auth returns 403", async () => {
    const res = await fetch(url("/api/admin/moderation/00000000-0000-4000-8000-000000000001/approve"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect([401, 403]).toContain(res.status);
  });

  it("POST /api/listings without CSRF returns 403", async () => {
    const res = await fetch(url("/api/listings"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
      },
      body: JSON.stringify({ title: "x", description: "y", price: 1, category: "Auto" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/auth/login with CSRF but invalid body returns 400", async () => {
    const { csrfToken, cookieHeader, origin } = await createCsrfSession(baseUrl);
    const res = await fetch(url("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "x-csrf-token": csrfToken,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register with CSRF creates user or conflicts", async () => {
    const { csrfToken, cookieHeader, origin } = await createCsrfSession(baseUrl);
    const uniqueEmail = `integration-${Date.now()}@example.com`;
    const body = {
      name: "Integration Test",
      email: uniqueEmail,
      password: "Password1!",
      confirmPassword: "Password1!",
      acceptTerms: true,
      acceptPrivacy: true,
    };
    const res = await fetch(url("/api/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "x-csrf-token": csrfToken,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    expect([200, 201, 400, 409, 429]).toContain(res.status);
    if (res.ok) {
      const data = (await res.json()) as { email?: string; accessToken?: string };
      expect(data.email || data.accessToken).toBeTruthy();
    }
  });
});
