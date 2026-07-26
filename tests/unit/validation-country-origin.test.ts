import { listingCreateSchema } from "@/lib/security/validation-schemas";

describe("listingCreateSchema countryOfOrigin", () => {
    const base = {
    title: "BMW Seria 3 320d test",
    description: "Descriere suficient de lunga pentru validare.",
    category: "Auto, moto și ambarcațiuni",
    subcategory: "Autoturisme",
    priceAmount: 10000,
    county: "București",
    city: "Sectorul 1",
    photos: ["/uploads/listings/x/original/a.jpg"],
  };

  it("accepts full country code from shared list", () => {
    const parsed = listingCreateSchema.safeParse({
      ...base,
      countryOfOrigin: "DE",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.countryOfOrigin).toBe("DE");
  });

  it("normalizes Romanian label to ISO value", () => {
    const parsed = listingCreateSchema.safeParse({
      ...base,
      countryOfOrigin: "Germania",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.countryOfOrigin).toBe("DE");
  });

  it("rejects overlong unknown country string", () => {
    const parsed = listingCreateSchema.safeParse({
      ...base,
      countryOfOrigin: "X".repeat(20),
    });
    expect(parsed.success).toBe(false);
  });
});
