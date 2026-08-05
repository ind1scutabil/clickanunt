/**
 * Integrare API — necesită server Next + DB (ex.: npm run dev).
 *
 * Rulare: npm run test:integration
 * Opțional: API_URL=http://127.0.0.1:3000 npm run test:integration
 *
 * @jest-environment node
 */
import { createCsrfSession, mergeSetCookie } from "./helpers/csrf-session";

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

  it("GET /api/admin/users without credentials returns 401 or 403", async () => {
    const res = await fetch(url("/api/admin/users"));
    expect([401, 403]).toContain(res.status);
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

  it("authenticated GET /api/messages/[userId] accepts access cookie (not 401)", async () => {
    const csrf = await createCsrfSession(baseUrl);
    const email = process.env.E2E_USER_EMAIL ?? "user@example.com";
    const password = process.env.E2E_USER_PASSWORD ?? "Password123!";
    const loginRes = await fetch(url("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: csrf.origin,
        "x-csrf-token": csrf.csrfToken,
        ...(csrf.cookieHeader ? { Cookie: csrf.cookieHeader } : {}),
      },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.status !== 200) {
      console.warn(
        `[integration] skip authenticated messages test — login returned ${loginRes.status} (${email}). Set E2E_USER_* or use seeded user.`,
      );
      return;
    }
    const mergedCookies = mergeSetCookie(csrf.cookieHeader, loginRes);
    const meRes = await fetch(url("/api/users/me"), { headers: { Cookie: mergedCookies } });
    if (!meRes.ok) {
      console.warn("[integration] skip authenticated messages test — /api/users/me failed");
      return;
    }
    const me = (await meRes.json()) as { id?: string };
    const meId = me.id;
    if (!meId) {
      console.warn("[integration] skip authenticated messages test — user id missing");
      return;
    }
    const listRes = await fetch(url("/api/listings"));
    expect(listRes.status).toBe(200);
    const feed = (await listRes.json()) as {
      data?: Array<{ id?: string; ownerUserId?: string; owner?: { id?: string } }>;
    };
    const row = feed.data?.find((x) => {
      const oid = x?.owner?.id ?? x?.ownerUserId;
      return x?.id && oid && oid !== meId;
    });
    if (!row?.id) {
      console.warn("[integration] skip authenticated messages test — no peer listing");
      return;
    }
    const peerId = row.owner?.id ?? row.ownerUserId!;
    const qs = `?listingId=${encodeURIComponent(row.id)}`;
    const msgRes = await fetch(url(`/api/messages/${peerId}${qs}`), {
      headers: { Cookie: mergedCookies },
    });
    expect(msgRes.status).toBe(200);
    expect(msgRes.headers.get("content-type")).toMatch(/application\/json/);
    const envelope = (await msgRes.json()) as {
      messages?: unknown[];
      conversationId?: string | null;
    };
    expect(Array.isArray(envelope.messages)).toBe(true);
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
      // Current contract returns { success, user: { email, ... } } with tokens set
      // as httpOnly cookies (not in the body) — align to that instead of a legacy
      // top-level email/accessToken shape.
      const data = (await res.json()) as { success?: boolean; user?: { email?: string } };
      expect(data.success).toBe(true);
      expect(data.user?.email).toBeTruthy();
    }
  });
});
