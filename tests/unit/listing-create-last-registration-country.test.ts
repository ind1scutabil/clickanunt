/**
 * Regression test for a real, reported "Publicare eșuată — Atribute
 * incompatibile cu categoria: lastRegistrationCountry" failure blocking Auto
 * listing publish end-to-end.
 *
 * Root cause: appendAutoFieldsToListingPayload() puts lastRegistrationCountry
 * into `attributes` (there is no dedicated top-level column for it, unlike
 * countryOfOrigin), but lib/taxonomy.ts never listed lastRegistrationCountry
 * as an allowed attribute key for "Auto, moto și ambarcațiuni" — so
 * listingCreateSchema's attribute allowlist check stripped it and rejected
 * the whole submission.
 *
 * Fixed by adding it to the Auto category's sharedAttributes in
 * lib/taxonomy.ts. Kept as a permanent regression guard.
 */
import { listingCreateSchema } from "@/lib/security/validation-schemas";
import { appendAutoFieldsToListingPayload } from "@/lib/listing-auto-create-payload";

function basePayload(): Record<string, unknown> {
  return {
    title: "Skoda Octavia 2.0 TDI AZV",
    description: "Vând Skoda Octavia 2.0 TDI AZV, 136 CP, 2009.",
    category: "Auto, moto și ambarcațiuni",
    subcategory: "Autoturisme",
    priceType: "FIXED",
    priceAmount: 3500,
    priceCurrency: "EUR",
    city: "Târgu Jiu",
    county: "Gorj",
    photos: ["/api/uploads/serve?key=listings/test/medium/1.jpg"],
    make: "Skoda",
    model: "Octavia",
    year: 2009,
    mileage: 210000,
    fuel: "diesel",
    transmission: "manual",
  };
}

describe("Auto listing publish — lastRegistrationCountry", () => {
  it("accepts a valid submission that sets Ultima țară de înmatriculare (was rejected before the fix)", () => {
    const payload = basePayload();
    appendAutoFieldsToListingPayload(payload, {
      lastRegistrationCountry: "RO",
    });

    const result = listingCreateSchema.safeParse(payload);

    if (!result.success) {
      // Fails loudly with the real Zod issues instead of a bare boolean —
      // easier to diagnose if this regresses.
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
    expect((result.data.attributes as Record<string, unknown> | undefined)?.lastRegistrationCountry).toBe("RO");
  });

  it("the same submission without lastRegistrationCountry succeeds (isolates the field as the cause)", () => {
    const payload = basePayload();
    const result = listingCreateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("countryOfOrigin (Țara de proveniență) is unaffected — it is a top-level field, not in attributes", () => {
    const payload = basePayload();
    appendAutoFieldsToListingPayload(payload, {
      countryOfOrigin: "Germania",
    });
    const result = listingCreateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
