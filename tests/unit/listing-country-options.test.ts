import {
  LISTING_COUNTRY_OF_ORIGIN_OPTIONS,
  formatCountryOfOriginDisplay,
  isKnownCountryOfOriginValue,
  normalizeCountryOfOriginValue,
} from "@/lib/listing-country-options";
import { buildListingSpecRows } from "@/lib/listing-category-specs";
import { appendAutoFieldsToListingPayload } from "@/lib/listing-auto-create-payload";

describe("listing-country-options", () => {
  const requiredLabels = [
    "România",
    "Germania",
    "Franța",
    "Italia",
    "Spania",
    "Regatul Unit",
    "Elveția",
    "Statele Unite ale Americii",
    "Japonia",
    "Altă țară",
  ];

  it("includes required countries", () => {
    const labels = LISTING_COUNTRY_OF_ORIGIN_OPTIONS.map((o) => o.label);
    for (const label of requiredLabels) {
      expect(labels).toContain(label);
    }
  });

  it("has no duplicate labels or values", () => {
    const labels = LISTING_COUNTRY_OF_ORIGIN_OPTIONS.map((o) => o.label);
    const values = LISTING_COUNTRY_OF_ORIGIN_OPTIONS.map((o) => o.value);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(values).size).toBe(values.length);
  });

  it("puts România first and Altă țară last", () => {
    expect(LISTING_COUNTRY_OF_ORIGIN_OPTIONS[0].label).toBe("România");
    expect(
      LISTING_COUNTRY_OF_ORIGIN_OPTIONS[
        LISTING_COUNTRY_OF_ORIGIN_OPTIONS.length - 1
      ].label
    ).toBe("Altă țară");
  });

  it("normalizes legacy ISO and Romanian labels", () => {
    expect(normalizeCountryOfOriginValue("DE")).toBe("DE");
    expect(normalizeCountryOfOriginValue("Germania")).toBe("DE");
    expect(normalizeCountryOfOriginValue("România")).toBe("RO");
    expect(formatCountryOfOriginDisplay("DE")).toBe("Germania");
    expect(formatCountryOfOriginDisplay("GB")).toBe("Regatul Unit");
  });

  it("create payload includes country and auto fields", () => {
    const payload: Record<string, unknown> = {
      title: "Test",
      category: "Auto, moto și ambarcațiuni",
    };
    appendAutoFieldsToListingPayload(payload, {
      countryOfOrigin: "Germania",
      lastRegistrationCountry: "RO",
      bodyType: "sedan",
      horsepower: 150,
    });
    expect(payload.countryOfOrigin).toBe("DE");
    expect(payload.bodyType).toBe("sedan");
    expect(payload.horsepower).toBe(150);
    const attrs = payload.attributes as Record<string, string>;
    expect(attrs.lastRegistrationCountry).toBe("RO");
  });

  it("listing detail specs show Țara de proveniență", () => {
    const rows = buildListingSpecRows({
      category: "Auto, moto și ambarcațiuni",
      attributes: { countryOfOrigin: "IT" },
    });
    const country = rows.find((r) => r.label === "Țara de proveniență");
    expect(country?.value).toBe("Italia");
    expect(isKnownCountryOfOriginValue("IT")).toBe(true);
  });
});
