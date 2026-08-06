/**
 * Documents the silent publish failure when phone was empty:
 * frontend validateStep(3) required phone, but listingCreateSchema.contactPhone
 * is optional — so submit aborted with an error rendered above the fold
 * (behind a large preview) and no focus/scroll.
 */
import {
  mapListingPublishPhoneApiError,
  validateListingContactPhoneInput,
} from "@/lib/listing-contact-phone";
import { listingCreateSchema } from "@/lib/security/validation-schemas";

function baseCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Skoda Octavia 2.0 TDI test phone UX",
    description: "Descriere suficient de lunga pentru publicare.",
    category: "Auto, moto și ambarcațiuni",
    subcategory: "Autoturisme",
    priceType: "FIXED",
    priceAmount: 3500,
    priceCurrency: "EUR",
    city: "Cluj-Napoca",
    county: "Cluj",
    photos: [
      "/api/uploads/serve?key=listings/e86eeb24-69a1-497a-b86e-9142d7bb5293/original/1779061610719-mxiab.jpg",
    ],
    make: "Skoda",
    model: "Octavia",
    year: 2009,
    mileage: 210000,
    fuel: "diesel",
    transmission: "manual",
    ...overrides,
  };
}

describe("listing contact phone — publish gate", () => {
  it("backend accepts create payload without contactPhone (phone is optional)", () => {
    const result = listingCreateSchema.safeParse(baseCreateBody());
    expect(result.success).toBe(true);
  });

  it("backend accepts create payload with empty contactPhone", () => {
    const result = listingCreateSchema.safeParse(baseCreateBody({ contactPhone: "" }));
    expect(result.success).toBe(true);
  });

  it("frontend helper allows empty phone (no accidental block)", () => {
    expect(validateListingContactPhoneInput("")).toEqual({ ok: true, value: undefined });
    expect(validateListingContactPhoneInput("   ")).toEqual({ ok: true, value: undefined });
  });

  it("frontend helper accepts a valid RO mobile", () => {
    expect(validateListingContactPhoneInput("0712345678")).toEqual({
      ok: true,
      value: "0712345678",
    });
  });

  it("frontend helper rejects invalid non-empty phone with a human message", () => {
    const result = validateListingContactPhoneInput("123");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/telefon este invalid/i);
    }
  });

  it("maps API phone errors to a human message", () => {
    expect(mapListingPublishPhoneApiError("contactPhone: Număr telefon invalid")).toMatch(
      /telefon este invalid/i
    );
    expect(mapListingPublishPhoneApiError("attributes: something else")).toBeNull();
  });

  it("backend rejects invalid non-empty contactPhone", () => {
    const result = listingCreateSchema.safeParse(baseCreateBody({ contactPhone: "12" }));
    expect(result.success).toBe(false);
  });
});
