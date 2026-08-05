/** @jest-environment node */
import { buildSeedListingCreateData } from "@/lib/seed-listings-data";

describe("buildSeedListingCreateData", () => {
  it("sets FIXED for non-Job amount > 0 without inventing FREE", () => {
    const d = buildSeedListingCreateData({
      category: "Electronice și electrocasnice",
      title: "Telefon",
      description: "desc",
      priceAmount: 100,
      county: "Cluj",
      city: "Cluj-Napoca",
    });
    expect(d.priceType).toBe("FIXED");
    expect(d.priceCurrency).toBe("RON");
    expect(d.priceAmount).toBe(100);
  });

  it("preserves explicit commercial priceType", () => {
    const d = buildSeedListingCreateData({
      category: "Servicii, afaceri, echipamente",
      title: "Serviciu",
      description: "desc",
      priceAmount: 50,
      priceType: "FROM",
      priceCurrency: "EUR",
      county: "Cluj",
      city: "Cluj-Napoca",
    });
    expect(d.priceType).toBe("FROM");
    expect(d.priceCurrency).toBe("EUR");
  });

  it("leaves Job without commercial priceType", () => {
    const d = buildSeedListingCreateData({
      category: "Locuri de muncă",
      title: "Dev",
      description: "desc",
      priceAmount: 8000,
      county: "Cluj",
      city: "Cluj-Napoca",
    });
    expect(d.priceType).toBeUndefined();
    expect(d.priceAmount).toBe(8000);
  });

  it("rejects amount 0", () => {
    expect(() =>
      buildSeedListingCreateData({
        category: "Altele",
        title: "Zero",
        description: "desc",
        priceAmount: 0,
        county: "Cluj",
        city: "Cluj-Napoca",
      })
    ).toThrow(/nu crea 0/);
  });

  it("rejects Job with commercial priceType", () => {
    expect(() =>
      buildSeedListingCreateData({
        category: "Locuri de muncă",
        title: "Bad",
        description: "desc",
        priceAmount: 1,
        priceType: "FIXED",
        county: "Cluj",
        city: "Cluj-Napoca",
      })
    ).toThrow(/priceType comercial/);
  });
});
