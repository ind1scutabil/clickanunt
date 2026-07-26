/** @jest-environment node */
import { listingCreateSchema, listingEditSchema } from "@/lib/security/validation-schemas";
import {
  buildMobileCreatePayload,
  buildWebAutoCreatePayload,
  buildWebCreatePayload,
} from "@/lib/listing-create-payload-builders";
import { listingCreatePayloadMatchesExisting } from "@/lib/listing-create-idempotency";
import { assertAutoMakeModelPair } from "@/lib/listing-location-make-validation";

describe("listing create contract — web + mobile payloads", () => {
  it("accepts web valid payload", () => {
    expect(listingCreateSchema.safeParse(buildWebCreatePayload()).success).toBe(true);
  });

  it("accepts mobile valid payload", () => {
    expect(listingCreateSchema.safeParse(buildMobileCreatePayload()).success).toBe(true);
  });

  it("accepts Auto + non-Auto", () => {
    expect(listingCreateSchema.safeParse(buildWebAutoCreatePayload()).success).toBe(true);
    expect(
      listingCreateSchema.safeParse(
        buildWebCreatePayload({
          category: "Imobiliare",
          subcategory: "Apartamente de vânzare",
          title: "Apartament 2 camere central",
        })
      ).success
    ).toBe(true);
  });

  it("rejects county/city mismatch and accepts valid pair", () => {
    expect(
      listingCreateSchema.safeParse(
        buildWebCreatePayload({ county: "Cluj", city: "Sectorul 1" })
      ).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse(
        buildWebCreatePayload({ county: "Cluj", city: "Cluj-Napoca" })
      ).success
    ).toBe(true);
  });

  it("rejects make/model incompatibilities; allows omit on non-Auto", () => {
    expect(
      listingCreateSchema.safeParse(
        buildWebAutoCreatePayload({ make: "Peugeot", model: "Golf" })
      ).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse(
        buildWebAutoCreatePayload({ make: "Peugeot", model: undefined })
      ).success
    ).toBe(false);
    expect(
      assertAutoMakeModelPair({
        category: "Altele",
        make: "Peugeot",
        model: "508",
      }).ok
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse(
        buildMobileCreatePayload({ make: undefined, model: undefined })
      ).success
    ).toBe(true);
  });

  it("coerces price string like mobile Number() path; rejects zero", () => {
    const asString = listingCreateSchema.safeParse({
      ...buildMobileCreatePayload(),
      priceAmount: "150" as unknown as number,
    });
    expect(asString.success).toBe(true);
    expect(listingCreateSchema.safeParse(buildMobileCreatePayload({ priceAmount: 0 })).success).toBe(
      false
    );
  });

  it("accepts RON/EUR currency; rejects spoof admin fields and video", () => {
    expect(
      listingCreateSchema.safeParse(buildWebCreatePayload({ priceCurrency: "EUR" })).success
    ).toBe(true);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        status: "active",
      } as never).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        isFeatured: true,
      } as never).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        isPromoted: true,
      } as never).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        video: "https://example.com/v.mp4",
      } as never).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        videoUrl: "https://example.com/v.mp4",
      } as never).success
    ).toBe(false);
    expect(
      listingCreateSchema.safeParse({
        ...buildWebCreatePayload(),
        video: { url: "https://example.com/v.mp4" },
      } as never).success
    ).toBe(false);
  });

  it("requires photos 1–20", () => {
    expect(
      listingCreateSchema.safeParse(buildWebCreatePayload({ photos: [] })).success
    ).toBe(false);
  });
});

describe("listing edit contract — legacy location", () => {
  it("allows patch without location (legacy rows)", () => {
    const parsed = listingEditSchema.safeParse({
      title: "Titlu actualizat suficient",
      description: "Descriere editata suficient de lunga.",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires county+city pair when either is sent", () => {
    expect(
      listingEditSchema.safeParse({ county: "Cluj" }).success
    ).toBe(false);
    expect(
      listingEditSchema.safeParse({ city: "Cluj-Napoca" }).success
    ).toBe(false);
    expect(
      listingEditSchema.safeParse({ county: "Cluj", city: "Cluj-Napoca" }).success
    ).toBe(true);
    expect(
      listingEditSchema.safeParse({ county: "Cluj", city: "Sectorul 1" }).success
    ).toBe(false);
  });
});

describe("idempotency payload match", () => {
  const base = {
    title: "Same",
    category: "Altele",
    priceAmount: 10,
    priceCurrency: "RON",
    county: "Cluj",
    city: "Cluj-Napoca",
    photos: ["/a.jpg"],
  };

  it("matches identical payloads", () => {
    expect(listingCreatePayloadMatchesExisting(base, { ...base })).toBe(true);
  });

  it("rejects same session key with different content", () => {
    expect(
      listingCreatePayloadMatchesExisting(base, { ...base, title: "Other" })
    ).toBe(false);
    expect(
      listingCreatePayloadMatchesExisting(base, { ...base, priceAmount: 99 })
    ).toBe(false);
  });
});
