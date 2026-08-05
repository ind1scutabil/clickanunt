/** @jest-environment node */
/**
 * Replaced by indexnow-listing-notify.test.ts + indexnow-route-hooks.test.ts.
 * Keep a thin smoke that imports the shared helper API used by all routes.
 */
import {
  notifyListingIndexNowAfterSuccess,
  shouldNotifyListingIndexNow,
} from "@/lib/seo/indexnow-listing-notify";

describe("IndexNow publish gates (shared helper)", () => {
  it("exports a single decision path used by owner and admin routes", () => {
    expect(typeof shouldNotifyListingIndexNow).toBe("function");
    expect(typeof notifyListingIndexNowAfterSuccess).toBe("function");
    expect(
      shouldNotifyListingIndexNow({
        before: { status: "pending", deletedAt: null },
        after: { status: "active", deletedAt: null },
        changedKeys: ["status"],
      })
    ).toBe(true);
  });
});
