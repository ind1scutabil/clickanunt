import {
  getListingImageUrl,
  getNextListingImageFallbackVariant,
  rewriteListingPhotoToVariant,
  siblingVariantStorageKey,
} from "@/lib/listing-image-variants";

describe("listing-image-variants", () => {
  it("rewrites serve URL original to thumb", () => {
    const orig =
      "/api/uploads/serve?key=listings%2Fabcd%2Foriginal%2Ffile.jpg";
    const thumb = rewriteListingPhotoToVariant(orig, "thumb");
    expect(thumb).toContain("%2Fthumb%2F");
    expect(thumb).not.toContain("%2Foriginal%2F");
  });

  it("getListingImageUrl falls back to original when no segment", () => {
    const flat = "/uploads/legacy-only.jpg";
    expect(getListingImageUrl(flat, "thumb")).toBe(flat);
  });

  it("siblingVariantStorageKey preserves filename", () => {
    expect(
      siblingVariantStorageKey("listings/u1/original/x.jpg", "medium")
    ).toBe("listings/u1/medium/x.jpg");
  });

  it("getNextListingImageFallbackVariant advances chain", () => {
    expect(getNextListingImageFallbackVariant("medium", "medium")).toBe(
      "original"
    );
    expect(getNextListingImageFallbackVariant("thumb", "thumb")).toBe("medium");
    expect(getNextListingImageFallbackVariant("medium", "original")).toBeNull();
  });
});
