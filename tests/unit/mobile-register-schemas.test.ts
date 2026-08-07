import {
  mobileRegisterExtendedSchema,
  mobileRegisterSchema,
} from "@/lib/security/validation-schemas";

const strongPassword = "Abcd1234!";

describe("mobileRegisterSchema", () => {
  it("accepts mobile personal payload without confirmPassword/terms", () => {
    const result = mobileRegisterSchema.safeParse({
      email: "Person@Example.com",
      password: strongPassword,
      name: "Ana Pop",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("person@example.com");
      expect(result.data.name).toBe("Ana Pop");
    }
  });

  it("rejects empty body with field errors (never HTML)", () => {
    const result = mobileRegisterSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const result = mobileRegisterSchema.safeParse({
      email: "a@example.com",
      password: "weak",
      name: "Ana Pop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched optional confirmPassword", () => {
    const result = mobileRegisterSchema.safeParse({
      email: "a@example.com",
      password: strongPassword,
      confirmPassword: "Other1234!",
      name: "Ana Pop",
    });
    expect(result.success).toBe(false);
  });

  it("strips/rejects privilege injection via strict schema", () => {
    const result = mobileRegisterSchema.safeParse({
      email: "a@example.com",
      password: strongPassword,
      name: "Ana Pop",
      role: "admin",
      emailVerified: true,
      isAdmin: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("mobileRegisterExtendedSchema", () => {
  it("accepts personal accountType", () => {
    const result = mobileRegisterExtendedSchema.safeParse({
      email: "biz@example.com",
      password: strongPassword,
      accountType: "personal",
      name: "Ion Ionescu",
    });
    expect(result.success).toBe(true);
  });

  it("accepts business with required fields; location optional", () => {
    const result = mobileRegisterExtendedSchema.safeParse({
      email: "dealer@example.com",
      password: strongPassword,
      accountType: "business",
      name: "Contact Pers",
      businessName: "Auto Dealer SRL",
      businessCUI: "RO12345678",
      businessRegCom: "J40/123/2020",
      businessPhone: "0712345678",
      businessCategory: "auto_dealer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects arbitrary accountType", () => {
    const result = mobileRegisterExtendedSchema.safeParse({
      email: "x@example.com",
      password: strongPassword,
      accountType: "superadmin",
      name: "X",
    });
    expect(result.success).toBe(false);
  });

  it("rejects business missing CUI", () => {
    const result = mobileRegisterExtendedSchema.safeParse({
      email: "x@example.com",
      password: strongPassword,
      accountType: "business",
      name: "Contact",
      businessName: "Firma",
      businessRegCom: "J40/1/2020",
      businessPhone: "0712345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects privilege injection", () => {
    const result = mobileRegisterExtendedSchema.safeParse({
      email: "x@example.com",
      password: strongPassword,
      accountType: "personal",
      name: "Contact",
      role: "admin",
      verified: true,
    });
    expect(result.success).toBe(false);
  });
});
