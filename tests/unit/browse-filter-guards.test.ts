/** @jest-environment node */
import {
  buildAttributesContainmentObject,
  guardBrowsePriceBand,
  guardVehicleFiltersForCategory,
} from "@/lib/listings/browse-filter-guards";

describe("browse-filter-guards", () => {
  describe("guardBrowsePriceBand", () => {
    it("allows empty band without currency", () => {
      expect(guardBrowsePriceBand({ minPrice: null, maxPrice: null, priceCurrency: null })).toEqual({
        ok: true,
        minPrice: null,
        maxPrice: null,
        priceCurrency: null,
      });
    });

    it("requires currency when min/max set", () => {
      const r = guardBrowsePriceBand({ minPrice: 100, maxPrice: null, priceCurrency: null });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/priceCurrency/i);
    });

    it("rejects min > max", () => {
      const r = guardBrowsePriceBand({ minPrice: 200, maxPrice: 100, priceCurrency: "RON" });
      expect(r.ok).toBe(false);
    });

    it("accepts RON band", () => {
      expect(guardBrowsePriceBand({ minPrice: 100, maxPrice: 500, priceCurrency: "ron" })).toEqual({
        ok: true,
        minPrice: 100,
        maxPrice: 500,
        priceCurrency: "RON",
      });
    });
  });

  describe("guardVehicleFiltersForCategory", () => {
    it("rejects make on non-Auto category", () => {
      const r = guardVehicleFiltersForCategory({
        category: "Electronice și electrocasnice",
        make: "BMW",
      });
      expect(r.ok).toBe(false);
    });

    it("allows make on Auto category", () => {
      const r = guardVehicleFiltersForCategory({
        category: "Auto, moto și ambarcațiuni",
        make: "BMW",
      });
      expect(r).toEqual({ ok: true, apply: true });
    });

    it("allows make when category absent (hub URL)", () => {
      expect(guardVehicleFiltersForCategory({ category: null, make: "BMW" })).toEqual({
        ok: true,
        apply: true,
      });
    });
  });

  describe("buildAttributesContainmentObject", () => {
    it("builds stable json object", () => {
      expect(
        buildAttributesContainmentObject([
          { key: "brand", value: "Samsung" },
          { key: "storage_gb", value: 128 },
        ])
      ).toEqual({ brand: "Samsung", storage_gb: 128 });
    });
  });
});
