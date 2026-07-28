/**
 * Unit tests for open-redirect-safe post-login return paths.
 */
import { sanitizeAuthReturnPath } from "@/lib/auth/safe-auth-return-path";

describe("sanitizeAuthReturnPath", () => {
  it("allows publish entry", () => {
    expect(sanitizeAuthReturnPath("/listings/new")).toBe("/listings/new");
  });

  it("allows favorites, messages, dashboard, and admin surfaces", () => {
    expect(sanitizeAuthReturnPath("/favorites")).toBe("/favorites");
    expect(sanitizeAuthReturnPath("/messages")).toBe("/messages");
    expect(sanitizeAuthReturnPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeAuthReturnPath("/dashboard/listings")).toBe(
      "/dashboard/listings"
    );
    expect(sanitizeAuthReturnPath("/dashboard/favorites")).toBe(
      "/dashboard/favorites"
    );
    expect(sanitizeAuthReturnPath("/admin/dashboard")).toBe("/admin/dashboard");
    expect(sanitizeAuthReturnPath("/admin/moderation")).toBe(
      "/admin/moderation"
    );
  });

  it("allows listing message threads", () => {
    expect(
      sanitizeAuthReturnPath("/listings/abc-123/messages")
    ).toBe("/listings/abc-123/messages");
  });

  it("rejects open redirects and traversal", () => {
    expect(sanitizeAuthReturnPath("https://evil.example/")).toBeNull();
    expect(sanitizeAuthReturnPath("//evil.example")).toBeNull();
    expect(sanitizeAuthReturnPath("/\\evil")).toBeNull();
    expect(sanitizeAuthReturnPath("/listings/new/../admin")).toBeNull();
    expect(sanitizeAuthReturnPath(encodeURIComponent("https://evil.example"))).toBeNull();
    expect(sanitizeAuthReturnPath(encodeURIComponent("//evil.example"))).toBeNull();
    expect(sanitizeAuthReturnPath("%2F%2Fevil.example")).toBeNull();
    expect(sanitizeAuthReturnPath("/settings")).toBeNull();
    expect(sanitizeAuthReturnPath("/api/users/me")).toBeNull();
  });

  it("strips query/hash and handles empty", () => {
    expect(sanitizeAuthReturnPath("/listings/new?x=1")).toBe("/listings/new");
    expect(sanitizeAuthReturnPath("/favorites#top")).toBe("/favorites");
    expect(sanitizeAuthReturnPath(null)).toBeNull();
    expect(sanitizeAuthReturnPath("")).toBeNull();
  });
});
