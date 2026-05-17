import { userProfileSettingsPatchSchema } from "@/lib/security/validation-schemas";

describe("userProfileSettingsPatchSchema", () => {
  it("accepts valid name and phone update", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({
      name: "Ion Popescu",
      phone: "+40722111222",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows empty phone string (cleared optional field)", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({
      phone: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows location-only update", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({
      location: "București",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty patch body", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid phone format", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({
      phone: "not-a-phone",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const parsed = userProfileSettingsPatchSchema.safeParse({
      name: "Test",
      role: "admin",
    });
    expect(parsed.success).toBe(false);
  });
});
