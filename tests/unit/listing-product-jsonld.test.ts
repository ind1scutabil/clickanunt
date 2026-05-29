import {
  buildClassifiedMerchantReturnPolicy,
  buildClassifiedOfferPolicyFields,
  buildListingLocationPlace,
  buildListingProductIdentifierFields,
  buildVehicleProductFields,
  isValidListingVin,
} from "@/lib/seo/listing-product-jsonld";

describe("listing-product-jsonld", () => {
  it("accepts valid 17-char VIN", () => {
    expect(isValidListingVin("WBADT43452G123456")).toBe(true);
  });

  it("rejects short or invalid VIN characters", () => {
    expect(isValidListingVin("WB123")).toBe(false);
    expect(isValidListingVin("WBADT43452G12345I")).toBe(false);
    expect(isValidListingVin(null)).toBe(false);
  });

  it("adds brand and VIN only when present and valid", () => {
    const withVin = buildListingProductIdentifierFields({
      id: "abc",
      title: "BMW",
      make: "BMW",
      model: "320d",
      vin: "WBADT43452G123456",
    });
    expect(withVin.brand).toEqual({ "@type": "Brand", name: "BMW" });
    expect(withVin.vehicleIdentificationNumber).toBe("WBADT43452G123456");
    expect(withVin["@id"]).toContain("/listings/abc");

    const noBrand = buildListingProductIdentifierFields({
      id: "xyz",
      title: "Canapea",
    });
    expect(noBrand.brand).toBeUndefined();
    expect(noBrand.vehicleIdentificationNumber).toBeUndefined();
  });

  it("classified offer policy uses OnSitePickup and terms return link", () => {
    const policy = buildClassifiedMerchantReturnPolicy();
    expect(policy.returnPolicyCategory).toContain("MerchantReturnNotPermitted");
    expect(policy.merchantReturnLink).toContain("/terms");
    expect(buildClassifiedOfferPolicyFields().availableDeliveryMethod).toContain("OnSitePickup");
  });

  describe("buildListingLocationPlace", () => {
    it("returns undefined when neither city nor county present", () => {
      expect(buildListingLocationPlace({})).toBeUndefined();
      expect(buildListingLocationPlace({ city: "  ", county: null })).toBeUndefined();
    });

    it("emits RO PostalAddress with locality and region when present", () => {
      const place = buildListingLocationPlace({ city: "Cluj-Napoca", county: "Cluj" });
      expect(place).toEqual({
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressCountry: "RO",
          addressLocality: "Cluj-Napoca",
          addressRegion: "Cluj",
        },
      });
    });

    it("includes only the fields that exist (no fabrication)", () => {
      const place = buildListingLocationPlace({ city: "Iași" });
      expect(place?.address).toEqual({
        "@type": "PostalAddress",
        addressCountry: "RO",
        addressLocality: "Iași",
      });
    });
  });

  describe("buildVehicleProductFields", () => {
    it("maps factual year/mileage/fuel/transmission to schema.org fields", () => {
      const fields = buildVehicleProductFields({
        year: 2018,
        mileage: 120000,
        fuel: "diesel",
        transmission: "automatic",
      });
      expect(fields.vehicleModelDate).toBe("2018");
      expect(fields.mileageFromOdometer).toEqual({
        "@type": "QuantitativeValue",
        value: 120000,
        unitCode: "KMT",
      });
      expect(fields.fuelType).toBe("Motorină");
      expect(fields.vehicleTransmission).toBe("Automată");
    });

    it("skips out-of-range or unknown values rather than guessing", () => {
      const fields = buildVehicleProductFields({
        year: 1850,
        mileage: -5,
        fuel: "other",
        transmission: "other",
      });
      expect(fields).toEqual({});
    });

    it("returns empty object for fully missing vehicle data", () => {
      expect(buildVehicleProductFields({})).toEqual({});
    });
  });
});
