/**
 * @jest-environment jsdom
 */

import {
  WEB_AUTH_STORAGE_KEYS,
  cacheWebUserProfile,
  clearLegacyWebAuthStorage,
} from "@/lib/auth/clear-legacy-web-auth-storage";

jest.mock("@/lib/auth-session-events", () => ({
  broadcastAuthSessionChanged: jest.fn(),
}));

describe("clearLegacyWebAuthStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("removes only known auth keys and leaves drafts", () => {
    localStorage.setItem("accessToken", "jwt");
    localStorage.setItem("refreshToken", "jwt");
    localStorage.setItem("user", JSON.stringify({ id: "u1" }));
    localStorage.setItem("listingDraft", "{}");
    sessionStorage.setItem("accessToken", "jwt");

    const cleared = clearLegacyWebAuthStorage({ broadcast: false });
    expect(cleared).toBe(true);
    for (const key of WEB_AUTH_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(sessionStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("listingDraft")).toBe("{}");
  });

  it("can clear tokens without wiping user cache", () => {
    localStorage.setItem("accessToken", "jwt");
    localStorage.setItem("user", JSON.stringify({ id: "u1" }));
    clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeTruthy();
  });

  it("is idempotent when empty", () => {
    expect(clearLegacyWebAuthStorage({ broadcast: false })).toBe(false);
  });

  it("cacheWebUserProfile never keeps tokens", () => {
    localStorage.setItem("accessToken", "should-go");
    cacheWebUserProfile({
      id: "u1",
      email: "a@b.c",
      role: "user",
      name: "A",
    });
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(JSON.parse(localStorage.getItem("user") || "{}")).toMatchObject({
      id: "u1",
      email: "a@b.c",
      role: "user",
    });
  });
});
