import {
  buildClassifiedMerchantReturnPolicy,
  buildClassifiedOfferPolicyFields,
  buildListingProductIdentifierFields,
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
});
