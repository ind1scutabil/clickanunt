/** @jest-environment node */
import { listingJsonLdKindForCategory } from "@/lib/seo/listing-jsonld-policy";
import { TAXONOMY } from "@/lib/taxonomy";

describe("FAZA 5C JSON-LD category policy", () => {
  it("maps every taxonomy category to a known kind", () => {
    for (const cat of TAXONOMY) {
      const kind = listingJsonLdKindForCategory(cat.label);
      expect(["product_offer", "product_car", "job_posting", "omit_commercial"]).toContain(
        kind
      );
    }
  });

  it("uses Product/Car for auto, JobPosting for jobs, omit for unsafe commercial", () => {
    expect(listingJsonLdKindForCategory("Auto, moto și ambarcațiuni")).toBe("product_car");
    expect(listingJsonLdKindForCategory("Locuri de muncă")).toBe("job_posting");
    expect(listingJsonLdKindForCategory("Electronice și electrocasnice")).toBe("product_offer");
    expect(listingJsonLdKindForCategory("Imobiliare")).toBe("omit_commercial");
    expect(listingJsonLdKindForCategory("Servicii și afaceri")).toBe("omit_commercial");
    expect(listingJsonLdKindForCategory("Animale de companie")).toBe("omit_commercial");
    expect(listingJsonLdKindForCategory("Altele")).toBe("omit_commercial");
  });
});
