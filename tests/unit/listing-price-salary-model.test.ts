import {
  allowedPriceTypesFor,
  normalizeLegacyPricePayload,
  validatePriceSalaryFields,
} from "@/lib/listing-price-salary-policy";
import { formatListingCommercialOrSalaryLine } from "@/lib/format-listing-price";
import {
  buildCommercialOfferPriceFields,
  buildJobBaseSalaryJsonLd,
} from "@/lib/seo/listing-offer-jsonld";
import { validateEffectivePriceSalaryPatch } from "@/lib/listing-patch-price-salary";

describe("allowedPriceTypesFor matrix", () => {
  it("blocks FREE for Autoturisme", () => {
    expect(
      allowedPriceTypesFor("Auto, moto și ambarcațiuni", "Autoturisme")
    ).toEqual(["FIXED", "NEGOTIABLE"]);
  });

  it("allows FREE for product categories", () => {
    expect(
      allowedPriceTypesFor("Electronice și electrocasnice", "Telefoane mobile")
    ).toContain("FREE");
  });

  it("allows only FREE for Donații", () => {
    expect(allowedPriceTypesFor("Altele", "Donații")).toEqual(["FREE"]);
  });

  it("returns empty for Jobs", () => {
    expect(allowedPriceTypesFor("Locuri de muncă", "IT/Software")).toEqual([]);
  });

  it("blocks FREE for animal sales", () => {
    expect(allowedPriceTypesFor("Animale de companie", "Câini")).toEqual([
      "FIXED",
      "NEGOTIABLE",
    ]);
  });
});

describe("validatePriceSalaryFields", () => {
  it("requires amount for FIXED", () => {
    const issues = validatePriceSalaryFields({
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: null,
      priceCurrency: "RON",
    });
    expect(issues.some((i) => i.path === "priceAmount")).toBe(true);
  });

  it("forbids amount for FREE", () => {
    const issues = validatePriceSalaryFields({
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FREE",
      priceAmount: 0,
      priceCurrency: "RON",
    });
    expect(issues.some((i) => i.path === "priceAmount")).toBe(true);
  });

  it("accepts FREE with null amount", () => {
    const issues = validatePriceSalaryFields({
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FREE",
      priceAmount: null,
      priceCurrency: null,
    });
    expect(issues).toEqual([]);
  });

  it("rejects salary on non-Job", () => {
    const issues = validatePriceSalaryFields({
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: 100,
      priceCurrency: "RON",
      salaryMin: 1000,
    });
    expect(issues.some((i) => i.path === "salaryMin")).toBe(true);
  });

  it("accepts Job without salary", () => {
    const issues = validatePriceSalaryFields({
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      priceType: null,
      priceAmount: null,
    });
    expect(issues).toEqual([]);
  });

  it("requires period when salary amounts set", () => {
    const issues = validatePriceSalaryFields({
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      salaryMin: 5000,
      salaryCurrency: "RON",
    });
    expect(issues.some((i) => i.path === "salaryPeriod")).toBe(true);
  });

  it("rejects inverted salary range", () => {
    const issues = validatePriceSalaryFields({
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      salaryMin: 6000,
      salaryMax: 4000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(issues.some((i) => i.path === "salaryMax")).toBe(true);
  });
});

describe("normalizeLegacyPricePayload", () => {
  it("maps non-Job amount-only to FIXED", () => {
    expect(
      normalizeLegacyPricePayload({
        category: "Electronice și electrocasnice",
        priceAmount: 200,
        priceCurrency: "RON",
      })
    ).toMatchObject({ priceType: "FIXED", priceAmount: 200, legacyJobPriceAmount: false });
  });

  it("keeps Job legacy amount without inventing salary", () => {
    const n = normalizeLegacyPricePayload({
      category: "Locuri de muncă",
      priceAmount: 8000,
      priceCurrency: "RON",
    });
    expect(n.priceType).toBeNull();
    expect(n.legacyJobPriceAmount).toBe(true);
    expect(n.priceAmount).toBe(8000);
  });
});

describe("formatListingCommercialOrSalaryLine", () => {
  it("formats FIXED / NEGOTIABLE / FREE / ON_REQUEST / FROM", () => {
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Electronice și electrocasnice",
        priceType: "FIXED",
        priceAmount: 10000,
        priceCurrency: "EUR",
      }).primary
    ).toBe("10.000 EUR");
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Electronice și electrocasnice",
        priceType: "NEGOTIABLE",
        priceAmount: 10000,
        priceCurrency: "EUR",
      })
    ).toEqual({ primary: "10.000 EUR", suffix: "Negociabil" });
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Electronice și electrocasnice",
        priceType: "FREE",
      }).primary
    ).toBe("Gratuit");
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Servicii",
        priceType: "ON_REQUEST",
      }).primary
    ).toBe("Preț la cerere");
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Servicii",
        priceType: "FROM",
        priceAmount: 500,
        priceCurrency: "RON",
      }).primary
    ).toBe("De la 500 RON");
  });

  it("formats Job salary lines", () => {
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Locuri de muncă",
      }).primary
    ).toBe("Salariu nespecificat");
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Locuri de muncă",
        salaryMin: 5000,
        salaryMax: 5000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      })
    ).toEqual({ primary: "5.000 RON", suffix: "/lună" });
    expect(
      formatListingCommercialOrSalaryLine({
        category: "Locuri de muncă",
        salaryMin: 4000,
        salaryMax: 6000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      }).primary
    ).toBe("4.000–6.000 RON");
  });
});

describe("JSON-LD offer / baseSalary", () => {
  it("omits Offer price for ON_REQUEST", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Servicii",
        priceType: "ON_REQUEST",
      })
    ).toBeNull();
  });

  it("omits Offer.price for FREE (Google merchant requires price > 0)", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Electronice și electrocasnice",
        priceType: "FREE",
      })
    ).toBeNull();
  });

  it("emits Job baseSalary only with structured data", () => {
    expect(
      buildJobBaseSalaryJsonLd({
        category: "Locuri de muncă",
        salaryMin: 5000,
        salaryMax: 5000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      })
    ).toMatchObject({
      "@type": "MonetaryAmount",
      currency: "RON",
      value: { value: 5000, unitText: "MONTH" },
    });
    expect(
      buildJobBaseSalaryJsonLd({
        category: "Locuri de muncă",
        priceAmount: 8000,
      })
    ).toBeNull();
  });
});

describe("PATCH effective price/salary", () => {
  it("validates FIXED → FREE clears amount requirement", () => {
    const r = validateEffectivePriceSalaryPatch({
      existing: {
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        priceType: "FIXED",
        priceAmount: 100,
        priceCurrency: "RON",
      },
      patch: { priceType: "FREE", priceAmount: null },
      effectiveCategory: "Electronice și electrocasnice",
      effectiveSubcategory: "Telefoane mobile",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects salary on non-Job patch", () => {
    const r = validateEffectivePriceSalaryPatch({
      existing: {
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        priceType: "FIXED",
        priceAmount: 100,
        priceCurrency: "RON",
      },
      patch: { salaryMin: 1000 },
      effectiveCategory: "Electronice și electrocasnice",
      effectiveSubcategory: "Telefoane mobile",
    });
    expect(r.ok).toBe(false);
  });
});
