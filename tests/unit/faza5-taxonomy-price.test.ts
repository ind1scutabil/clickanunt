/** @jest-environment node */
import { TAXONOMY } from "@/lib/taxonomy";
import { CATEGORIES } from "@/lib/carData";
import {
  buildPersistedAttributes,
  findIncompatibleAutoTopLevelFields,
  isSubcategoryRequired,
  sanitizeListingAttributes,
} from "@/lib/listing-attributes-sanitize";
import {
  formatCategoryAwarePriceLine,
  getPriceFieldSemantics,
  shouldOmitProductOfferPrice,
} from "@/lib/listing-price-semantics";
import { listingCreateSchema } from "@/lib/security/validation-schemas";
import {
  buildJobsCreatePayload,
  buildWebAutoCreatePayload,
  buildWebCreatePayload,
} from "@/lib/listing-create-payload-builders";

describe("FAZA 5 taxonomy SSOT", () => {
  it("carData.CATEGORIES is derived from TAXONOMY labels", () => {
    for (const cat of TAXONOMY) {
      expect(CATEGORIES[cat.label]).toEqual(cat.subcategories.map((s) => s.label));
    }
    expect(Object.keys(CATEGORIES).sort()).toEqual(
      TAXONOMY.map((c) => c.label).sort()
    );
  });

  it("every category requires a subcategory (current taxonomy)", () => {
    for (const cat of TAXONOMY) {
      expect(isSubcategoryRequired(cat.label)).toBe(true);
      expect(cat.subcategories.length).toBeGreaterThan(0);
    }
  });
});

describe("FAZA 5 attribute sanitize", () => {
  it("strips foreign attribute keys", () => {
    const { attributes, strippedKeys } = sanitizeListingAttributes(
      "Locuri de muncă",
      "IT/Software",
      { salary_range: "5000-7000", rooms: 3, brand: "Apple" }
    );
    expect(attributes).toEqual({ salary_range: "5000-7000" });
    expect(strippedKeys.sort()).toEqual(["brand", "rooms"]);
  });

  it("rejects Auto fields on non-Auto categories", () => {
    expect(
      findIncompatibleAutoTopLevelFields("Imobiliare", {
        make: "BMW",
        model: "X5",
      })
    ).toEqual(["make", "model"]);
    expect(
      findIncompatibleAutoTopLevelFields("Auto, moto și ambarcațiuni", {
        make: "BMW",
      })
    ).toEqual([]);
  });

  it("does not merge Auto bag into non-Auto attributes", () => {
    const { attributes } = buildPersistedAttributes({
      categoryLabel: "Electronice și electrocasnice",
      subcategoryLabel: "Telefoane mobile",
      attributes: { brand: "Apple" },
      autoBagFields: { horsepower: 150, rare: true },
    });
    expect(attributes).toEqual({ brand: "Apple" });
  });
});

describe("FAZA 5 price semantics", () => {
  it("labels jobs as compat placeholder; omits Product Offer price", () => {
    expect(getPriceFieldSemantics("Locuri de muncă").meaning).toBe("jobs_compat_placeholder");
    expect(shouldOmitProductOfferPrice("Locuri de muncă")).toBe(true);
    expect(shouldOmitProductOfferPrice("Electronice și electrocasnice")).toBe(false);
  });

  it("prefers salary_range free text on cards without claiming structured salary", () => {
    const line = formatCategoryAwarePriceLine({
      categoryLabel: "Locuri de muncă",
      priceAmount: 1,
      priceCurrency: "RON",
      attributes: { salary_range: "4000-6000 RON net" },
    });
    expect(line.primary).toBe("4000-6000 RON net");
    expect(line.suffix).toBe("detalii text");
  });
});

describe("FAZA 5 listingCreateSchema category rules", () => {
  it("requires subcategory", () => {
    expect(
      listingCreateSchema.safeParse(buildWebCreatePayload({ subcategory: null })).success
    ).toBe(false);
    expect(listingCreateSchema.safeParse(buildWebCreatePayload()).success).toBe(true);
  });

  it("rejects Auto make on electronics", () => {
    expect(
      listingCreateSchema.safeParse(
        buildWebCreatePayload({ make: "Apple", model: "iPhone" })
      ).success
    ).toBe(false);
  });

  it("rejects foreign attributes", () => {
    expect(
      listingCreateSchema.safeParse(
        buildWebCreatePayload({
          attributes: { rooms: 3 },
        })
      ).success
    ).toBe(false);
  });

  it("accepts jobs payload with salary_range attribute", () => {
    expect(listingCreateSchema.safeParse(buildJobsCreatePayload()).success).toBe(true);
  });

  it("accepts auto payload with subcategory", () => {
    expect(listingCreateSchema.safeParse(buildWebAutoCreatePayload()).success).toBe(true);
  });
});
