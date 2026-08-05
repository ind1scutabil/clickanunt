/** @jest-environment node */

/**
 * Favorites POST eligibility — mirrors route guard (seo-indexable only).
 */
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

describe("favorites public listing eligibility", () => {
  const base = {
    status: "active" as const,
    deletedAt: null,
    moderationStatus: "approved" as const,
    expiresAt: null,
  };

  it("allows active approved non-expired", () => {
    expect(isListingSeoIndexable(base)).toBe(true);
  });

  it("rejects soft-deleted", () => {
    expect(
      isListingSeoIndexable({
        ...base,
        deletedAt: new Date(),
        status: "deleted",
      })
    ).toBe(false);
  });

  it("rejects expired-by-date", () => {
    expect(
      isListingSeoIndexable({
        ...base,
        expiresAt: new Date(Date.now() - 60_000),
      })
    ).toBe(false);
  });

  it("rejects pending moderation", () => {
    expect(
      isListingSeoIndexable({
        ...base,
        moderationStatus: "pending",
      })
    ).toBe(false);
  });
});
