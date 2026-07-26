/** @jest-environment node */
import { validateListingPatchTaxonomy } from "@/lib/listing-patch-taxonomy";

describe("validateListingPatchTaxonomy — no attributes bypass", () => {
  const autoExisting = {
    category: "Auto, moto și ambarcațiuni",
    subcategory: "Autoturisme",
    attributes: { condition: "Utilizat" },
  };

  const imoExisting = {
    category: "Imobiliare",
    subcategory: "Apartamente de vânzare",
    attributes: { rooms: 2 },
  };

  it("A: rejects foreign attributes without subcategory in PATCH", () => {
    const r = validateListingPatchTaxonomy({
      existing: autoExisting,
      patch: { attributes: { rooms: 4 } },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.path).toBe("attributes");
      expect(r.message).toMatch(/rooms/);
    }
  });

  it("B: rejects foreign attributes on imobiliare without subcategory in PATCH", () => {
    const r = validateListingPatchTaxonomy({
      existing: imoExisting,
      patch: { attributes: { condition: "used" } },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe("attributes");
  });

  it("accepts valid attributes without subcategory in PATCH (uses existing)", () => {
    const r = validateListingPatchTaxonomy({
      existing: imoExisting,
      patch: { attributes: { rooms: 3, surface_sqm: 60 } },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.attributesToPersist).toEqual({ rooms: 3, surface_sqm: 60 });
  });

  it("C: subcategory without category validated against existing category", () => {
    const bad = validateListingPatchTaxonomy({
      existing: autoExisting,
      patch: { subcategory: "Apartamente de vânzare" },
    });
    expect(bad.ok).toBe(false);

    const good = validateListingPatchTaxonomy({
      existing: autoExisting,
      patch: { subcategory: "SUV/Off-road" },
    });
    expect(good.ok).toBe(true);
  });

  it("D: category change without subcategory is rejected", () => {
    const r = validateListingPatchTaxonomy({
      existing: autoExisting,
      patch: { category: "Imobiliare" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe("subcategory");
  });

  it("category change clears attributes when not provided", () => {
    const r = validateListingPatchTaxonomy({
      existing: autoExisting,
      patch: {
        category: "Imobiliare",
        subcategory: "Apartamente de vânzare",
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attributesToPersist).toEqual({});
      expect(r.clearAutoFields).toBe(true);
    }
  });
});
