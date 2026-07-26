/** @jest-environment node */
import { listingCreateSchema } from "@/lib/security/validation-schemas";
import {
  assertAutoMakeModelPair,
  isCityInCounty,
} from "@/lib/listing-location-make-validation";

const base = {
  title: "Peugeot 508 BlueHDi",
  description: "Descriere suficient de lunga pentru validare.",
  category: "Auto, moto și ambarcațiuni",
  subcategory: "Autoturisme",
  priceAmount: 12500,
  county: "București",
  city: "Sectorul 1",
  photos: ["/uploads/listings/x/original/a.jpg"],
};

describe("listingCreateSchema publish alignment", () => {
  it("requires county, city, and price > 0", () => {
    expect(listingCreateSchema.safeParse({ ...base, priceAmount: 0 }).success).toBe(
      false
    );
    expect(
      listingCreateSchema.safeParse({ ...base, county: undefined }).success
    ).toBe(false);
    expect(listingCreateSchema.safeParse({ ...base, city: "" }).success).toBe(false);
    expect(listingCreateSchema.safeParse(base).success).toBe(true);
  });

  it("rejects city outside county and unknown admin fields", () => {
    expect(
      listingCreateSchema.safeParse({
        ...base,
        city: "Cluj-Napoca",
      }).success
    ).toBe(false);

    const mass = listingCreateSchema.safeParse({
      ...base,
      status: "active",
      isFeatured: true,
      moderationStatus: "approved",
      ownerUserId: "11111111-1111-4111-8111-111111111111",
    });
    // ownerUserId is optional UUID — status/featured stripped by .strict()
    expect(mass.success).toBe(false);
  });

  it("rejects incompatible make/model", () => {
    const pair = assertAutoMakeModelPair({
      category: base.category,
      make: "Peugeot",
      model: "Golf",
    });
    expect(pair.ok).toBe(false);
    expect(isCityInCounty("Cluj", "Cluj-Napoca")).toBe(true);
  });

  it("rejects unknown category / subcategory mismatch", () => {
    expect(
      listingCreateSchema.safeParse({ ...base, category: "NuExista" }).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...base,
        subcategory: "Apartamente",
      }).success
    ).toBe(false);
  });
});
