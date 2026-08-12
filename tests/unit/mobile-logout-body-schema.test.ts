/** @jest-environment node */
import {
  logoutBodySchema,
  pushTokenDeleteSchema,
} from "@/lib/security/validation-schemas";

describe("logoutBodySchema (mobile refresh revoke, web-compatible)", () => {
  it("accepts empty object (web Navbar logout)", () => {
    expect(logoutBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional refreshToken", () => {
    const token = "a".repeat(32);
    const parsed = logoutBodySchema.safeParse({ refreshToken: token });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    expect(logoutBodySchema.safeParse({ foo: 1 }).success).toBe(false);
  });
});

describe("pushTokenDeleteSchema", () => {
  it("accepts expoPushToken", () => {
    const parsed = pushTokenDeleteSchema.safeParse({
      expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing token", () => {
    expect(pushTokenDeleteSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      pushTokenDeleteSchema.safeParse({
        expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
        platform: "ios",
      }).success
    ).toBe(false);
  });
});
