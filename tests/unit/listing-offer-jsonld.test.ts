/** @jest-environment node */
import {
  buildCommercialOfferPriceFields,
  buildJobBaseSalaryJsonLd,
  buildJobEmploymentType,
} from "@/lib/seo/listing-offer-jsonld";
import { formatListingCommercialOrSalaryLine } from "@/lib/format-listing-price";

describe("JSON-LD commercial Offer price fields", () => {
  it("FIXED emits price", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Electronice și electrocasnice",
        priceType: "FIXED",
        priceAmount: 100,
        priceCurrency: "RON",
      })
    ).toEqual({ price: 100, priceCurrency: "RON" });
  });

  it("FROM emits price", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Servicii",
        priceType: "FROM",
        priceAmount: 50,
        priceCurrency: "EUR",
      })
    ).toEqual({ price: 50, priceCurrency: "EUR" });
  });

  it("NEGOTIABLE emits price when amount present", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Electronice și electrocasnice",
        priceType: "NEGOTIABLE",
        priceAmount: 80,
        priceCurrency: "RON",
      })
    ).toEqual({ price: 80, priceCurrency: "RON" });
  });

  it("FREE omits Offer.price (no invented 0)", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Altele",
        priceType: "FREE",
        priceAmount: null,
        priceCurrency: "RON",
      })
    ).toBeNull();
  });

  it("ON_REQUEST omits Offer.price", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Servicii",
        priceType: "ON_REQUEST",
        priceAmount: null,
      })
    ).toBeNull();
  });

  it("Job category never emits commercial Offer.price", () => {
    expect(
      buildCommercialOfferPriceFields({
        category: "Locuri de muncă",
        priceAmount: 5000,
        priceCurrency: "RON",
      })
    ).toBeNull();
  });
});

describe("JSON-LD JobPosting baseSalary", () => {
  it("legacy Job amount without structured salary → no baseSalary", () => {
    expect(
      buildJobBaseSalaryJsonLd({
        category: "Locuri de muncă",
        priceAmount: 5000,
      })
    ).toBeNull();
  });

  it("Job salary exact → MonetaryAmount value", () => {
    const sal = buildJobBaseSalaryJsonLd({
      category: "Locuri de muncă",
      salaryMin: 5000,
      salaryMax: 5000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(sal).toMatchObject({
      "@type": "MonetaryAmount",
      currency: "RON",
      value: { "@type": "QuantitativeValue", value: 5000, unitText: "MONTH" },
    });
  });

  it("Job salary interval → min/max", () => {
    const sal = buildJobBaseSalaryJsonLd({
      category: "Locuri de muncă",
      salaryMin: 4000,
      salaryMax: 6000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(sal).toMatchObject({
      currency: "RON",
      value: {
        minValue: 4000,
        maxValue: 6000,
        unitText: "MONTH",
      },
    });
  });
});

describe("JSON-LD JobPosting employmentType", () => {
  it("maps every known taxonomy contract_type option to a schema.org enum", () => {
    expect(buildJobEmploymentType("Full-time")).toBe("FULL_TIME");
    expect(buildJobEmploymentType("Part-time")).toBe("PART_TIME");
    expect(buildJobEmploymentType("Freelance")).toBe("CONTRACTOR");
    expect(buildJobEmploymentType("Internship")).toBe("INTERN");
    expect(buildJobEmploymentType("Temporar")).toBe("TEMPORARY");
  });

  it("returns null for unknown/missing contract_type (never invents a value)", () => {
    expect(buildJobEmploymentType("Ceva necunoscut")).toBeNull();
    expect(buildJobEmploymentType(undefined)).toBeNull();
    expect(buildJobEmploymentType(null)).toBeNull();
    expect(buildJobEmploymentType(42)).toBeNull();
  });
});

describe("FREE UI label", () => {
  it("formats Gratuit without 0 RON", () => {
    const line = formatListingCommercialOrSalaryLine({
      category: "Altele",
      priceType: "FREE",
      priceAmount: null,
      priceCurrency: "RON",
    });
    expect(line.primary).toMatch(/Gratuit/i);
    expect(line.primary).not.toMatch(/\b0\b/);
  });
});
