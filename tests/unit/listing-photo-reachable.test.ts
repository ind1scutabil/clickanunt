import {
  extractListingPhotoServeKey,
  listingPhotoServeKeyMatchesListing,
} from "@/lib/listing-photo-reachable";

describe("listing-photo-reachable", () => {
  it("extracts serve key from relative URL", () => {
    const key = extractListingPhotoServeKey(
      "/api/uploads/serve?key=listings%2Fabcd%2Foriginal%2Fx.jpg"
    );
    expect(key).toBe("listings/abcd/original/x.jpg");
  });

  it("matches listing folder in serve key", () => {
    const listingId = "6bdd34b6-56ae-4e20-af98-3efc57c6cdaf";
    expect(
      listingPhotoServeKeyMatchesListing(
        listingId,
        `/api/uploads/serve?key=listings%2F${listingId}%2Fmedium%2Fa.jpg`
      )
    ).toBe(true);
    expect(
      listingPhotoServeKeyMatchesListing(
        listingId,
        "/api/uploads/serve?key=listings%2F7512568d-d0c6-442c-8a25-7fbe37ffa2f0%2Fmedium%2Fa.jpg"
      )
    ).toBe(false);
  });
});
