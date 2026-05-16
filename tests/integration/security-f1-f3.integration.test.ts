/**
 * F1–F3: exposed endpoints must reject unauthenticated access.
 * Run with dev server: BASE_URL=http://localhost:3000 npm run test:integration
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function url(path: string) {
  return `${BASE.replace(/\/$/, "")}${path}`;
}

describe("security F1-F3 integration", () => {
  it("GET /api/moderate without auth returns 401", async () => {
    const res = await fetch(url("/api/moderate"));
    expect(res.status).toBe(401);
  });

  it("POST /api/moderate without auth returns 401", async () => {
    const res = await fetch(url("/api/moderate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", content: "hello" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/users without auth returns 401", async () => {
    const res = await fetch(url("/api/users"));
    expect(res.status).toBe(401);
  });

  it("POST /api/users without auth returns 401", async () => {
    const res = await fetch(url("/api/users"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "probe@example.com",
        password: "Password1!",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/subscriptions without auth returns 401", async () => {
    const res = await fetch(url("/api/subscriptions"));
    expect(res.status).toBe(401);
  });

  it("POST /api/subscriptions without auth returns 401", async () => {
    const res = await fetch(url("/api/subscriptions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "00000000-0000-4000-8000-000000000099",
      },
      body: JSON.stringify({ tier: "business" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/subscriptions ignores spoofed x-user-id without JWT", async () => {
    const res = await fetch(url("/api/subscriptions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "00000000-0000-4000-8000-000000000099",
      },
      body: JSON.stringify({ tier: "premium" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Unauthorized");
  });
});
