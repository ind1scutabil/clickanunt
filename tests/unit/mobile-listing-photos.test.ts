jest.mock("../../apps/mobile/src/config", () => ({
  MOBILE_CONFIG: { siteUrl: "https://www.clickanunt.ro" },
}));

import {
  listingPhotoUri,
  primaryListingPhotoUri,
} from "../../apps/mobile/src/utils/listingPhotos";

describe("mobile listingPhotos", () => {
  const serveOriginal =
    "/api/uploads/serve?key=listings%2Fu1%2Foriginal%2Fx.jpg";

  it("primaryListingPhotoUri uses medium segment when available", () => {
    const uri = primaryListingPhotoUri([serveOriginal]);
    expect(uri).toContain("https://www.clickanunt.ro");
    expect(uri).toContain("%2Fmedium%2F");
    expect(uri).not.toContain("%2Foriginal%2F");
  });

  it("listingPhotoUri falls back to original path for flat legacy URLs", () => {
    const flat = "/uploads/legacy.jpg";
    const uri = listingPhotoUri(flat, "thumb");
    expect(uri).toContain("legacy.jpg");
  });
});
