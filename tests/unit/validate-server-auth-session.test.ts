/**
 * @jest-environment jsdom
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock("@/lib/security/csrf-client", () => ({
  clearCsrfTokenCache: jest.fn(),
  getCsrfToken: jest.fn().mockResolvedValue("csrf-test"),
  fetchCsrfTokenFresh: jest.fn().mockResolvedValue("csrf-test"),
}));

jest.mock("@/lib/client-canonical-www", () => ({
  resolveClientApiUrl: (path: string) => path,
}));

jest.mock("@/lib/auth-session-events", () => ({
  broadcastAuthSessionChanged: jest.fn(),
}));

import { validateServerAuthSession } from "@/lib/admin-fetch";

describe("validateServerAuthSession (cookie-first)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ email: "a@test.ro", role: "user" }));
    localStorage.setItem("accessToken", "legacy-should-be-cleared");
    localStorage.setItem("refreshToken", "legacy-should-be-cleared");
  });

  it("GET /me with credentials, no Bearer; clears legacy JWT mirrors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "u1",
        email: "a@test.ro",
        role: "admin",
        name: "Admin",
      }),
    });

    const result = await validateServerAuthSession();

    expect(result.ok).toBe(true);
    expect(result.user?.role).toBe("admin");
    expect(result.user?.id).toBe("u1");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(JSON.parse(localStorage.getItem("user") || "{}")).toMatchObject({
      id: "u1",
      email: "a@test.ro",
      role: "admin",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0][0])).toContain("/api/users/me");
    const meInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(meInit.credentials).toBe("include");
    const headers = meInit.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("refreshes via cookie after 401 /me then retries", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauth" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, user: { email: "a@test.ro", role: "user" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "u1", email: "a@test.ro", role: "user", name: "U" }),
      });

    const result = await validateServerAuthSession();
    expect(result.ok).toBe(true);
    expect(String(mockFetch.mock.calls[0][0])).toContain("/api/users/me");
    expect(String(mockFetch.mock.calls[1][0])).toContain("/api/auth/refresh");
    expect(String(mockFetch.mock.calls[2][0])).toContain("/api/users/me");
  });

  it("returns ok:false on hard 401 and clears auth storage", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauth" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "fail" }),
      });

    const result = await validateServerAuthSession();
    expect(result.ok).toBe(false);
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
