/** @jest-environment node */
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";

describe("seoIndexableListingWhere", () => {
  it("requires active approved non-deleted listings", () => {
    const w = seoIndexableListingWhere();
    expect(w.status).toBe("active");
    expect(w.deletedAt).toBeNull();
    expect(w.moderationStatus).toBe("approved");
    expect(w.AND).toBeDefined();
  });
});
