/** @jest-environment node */
import { sanitizeAuthReturnPath } from "@/lib/auth/safe-auth-return-path";

describe("sanitizeAuthReturnPath", () => {
  it("allows exact /listings/new", () => {
    expect(sanitizeAuthReturnPath("/listings/new")).toBe("/listings/new");
  });

  it("rejects open redirects and off-allowlist paths", () => {
    expect(sanitizeAuthReturnPath("https://evil.example/")).toBeNull();
    expect(sanitizeAuthReturnPath("//evil.example")).toBeNull();
    expect(sanitizeAuthReturnPath("/\\evil")).toBeNull();
    expect(sanitizeAuthReturnPath("/dashboard")).toBeNull();
    expect(sanitizeAuthReturnPath("/listings/new/../admin")).toBeNull();
    expect(sanitizeAuthReturnPath(encodeURIComponent("https://evil.example"))).toBeNull();
    expect(sanitizeAuthReturnPath(encodeURIComponent("//evil.example"))).toBeNull();
    expect(sanitizeAuthReturnPath("%2F%2Fevil.example")).toBeNull();
    expect(sanitizeAuthReturnPath("/listings/new?x=1")).toBe("/listings/new");
    expect(sanitizeAuthReturnPath(null)).toBeNull();
    expect(sanitizeAuthReturnPath("")).toBeNull();
  });
});
