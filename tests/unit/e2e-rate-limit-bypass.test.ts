/** @jest-environment node */
import { isE2eRateLimitBypassEnabled } from "@/lib/e2e-rate-limit-bypass";

describe("isE2eRateLimitBypassEnabled", () => {
  it("denies when E2E flag unset", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        NODE_ENV: "development",
      })
    ).toBe(false);
  });

  it("allows in development with E2E flag alone", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        E2E_DISABLE_RATE_LIMIT: "1",
        NODE_ENV: "development",
      })
    ).toBe(true);
  });

  it("allows when NODE_ENV is test (jest) with E2E flag alone", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        E2E_DISABLE_RATE_LIMIT: "1",
        NODE_ENV: "test",
      })
    ).toBe(true);
  });

  it("denies production with E2E flag alone (misconfig)", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        E2E_DISABLE_RATE_LIMIT: "1",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("allows production only with explicit E2E server flag", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        E2E_DISABLE_RATE_LIMIT: "1",
        NODE_ENV: "production",
        CLICKANUNT_E2E_SERVER: "1",
      })
    ).toBe(true);
  });

  it("denies production when E2E server flag set but quota flag missing", () => {
    expect(
      isE2eRateLimitBypassEnabled({
        NODE_ENV: "production",
        CLICKANUNT_E2E_SERVER: "1",
      })
    ).toBe(false);
  });
});
