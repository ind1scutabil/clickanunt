import {
  extractEmailVerificationToken,
  isEmailVerificationDeepLink,
} from "@/lib/auth/email-verification-deep-link";

describe("email verification deep links", () => {
  test("extracts token from app scheme query", () => {
    const token = "a".repeat(43);
    expect(
      extractEmailVerificationToken(
        `clickanunt://auth/verify-email?token=${token}`
      )
    ).toBe(token);
    expect(
      isEmailVerificationDeepLink(
        `https://www.clickanunt.ro/auth/verify-email?token=${token}`
      )
    ).toBe(true);
  });

  test("rejects short or missing token", () => {
    expect(extractEmailVerificationToken("clickanunt://home")).toBeNull();
    expect(
      extractEmailVerificationToken("clickanunt://auth/verify-email?token=short")
    ).toBeNull();
  });
});
