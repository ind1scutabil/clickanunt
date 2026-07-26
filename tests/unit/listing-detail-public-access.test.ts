/** @jest-environment node */
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { readFileSync } from "fs";
import path from "path";

describe("public listing detail authorization — indexable gate", () => {
  const detailRoute = readFileSync(
    path.join(process.cwd(), "app/api/listings/[id]/route.ts"),
    "utf8",
  );
  const layout = readFileSync(
    path.join(process.cwd(), "app/listings/[id]/layout.tsx"),
    "utf8",
  );

  it("detail API uses isListingSeoIndexable for anonymous viewers", () => {
    expect(detailRoute).toContain("isListingSeoIndexable");
    expect(detailRoute).toContain("!isOwnerOrAdmin && !isListingSeoIndexable");
    expect(detailRoute).not.toMatch(/NON_PUBLIC_STATUSES/);
  });

  it("generateMetadata does not embed title for non-indexable listings", () => {
    expect(layout).toContain("isListingSeoIndexable");
    expect(layout).toMatch(/if\s*\(\s*!isListingSeoIndexable\(listing\)\s*\)/);
    expect(layout).not.toMatch(/listing\.title\s*—\s*anunț indisponibil/);
  });

  it.each([
    ["active", "approved", null, true],
    ["paused", "approved", null, false],
    ["deleted", "approved", null, false],
    ["expired", "approved", null, false],
    ["pending", "approved", null, false],
    ["rejected", "approved", null, false],
    ["active", "pending", null, false],
    ["active", "flagged", null, false],
    ["active", "rejected", null, false],
    ["active", "approved", new Date("2099-01-01"), true],
    ["active", "approved", new Date("2000-01-01"), false],
  ] as const)(
    "status=%s moderation=%s expires=%s → indexable=%s",
    (status, moderationStatus, expiresAt, expected) => {
      expect(
        isListingSeoIndexable({
          deletedAt: null,
          status: status as never,
          moderationStatus: moderationStatus as never,
          expiresAt,
        }),
      ).toBe(expected);
    },
  );

  it("soft-deleted is never indexable", () => {
    expect(
      isListingSeoIndexable({
        deletedAt: new Date(),
        status: "active" as never,
        moderationStatus: "approved" as never,
        expiresAt: null,
      }),
    ).toBe(false);
  });
});
