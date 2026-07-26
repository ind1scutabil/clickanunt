/** @jest-environment node */
import {
  INVALID_STATUS_ERROR,
  LISTING_STATUS_ENUM,
  collectStatusQueryValues,
  resolveListingFeedStatusFromSearchParams,
  resolveListingFeedStatusQuery,
} from "@/lib/listings/public-listing-status";

describe("resolveListingFeedStatusQuery — matrix", () => {
  describe("public (no owner scope)", () => {
    it.each([
      [undefined, "active"],
      ["", "active"],
      ["   ", "active"],
      ["active", "active"],
    ] as const)("raw=%j → ok active + indexable", (raw, expected) => {
      expect(resolveListingFeedStatusQuery(raw, false)).toEqual({
        ok: true,
        statusParam: expected,
        applyPublicIndexable: true,
      });
    });

    it.each([
      "all",
      "deleted",
      "paused",
      "expired",
      "draft",
      "pending",
      "sold",
      "rejected",
      "hidden",
      "garbage",
      "flagged",
      "ACTIVE",
    ] as const)("rejects non-active public status %j", (status) => {
      expect(resolveListingFeedStatusQuery(status, false)).toEqual({
        ok: false,
        error: INVALID_STATUS_ERROR,
      });
    });
  });

  describe("owner/admin scope", () => {
    it("allows all", () => {
      expect(resolveListingFeedStatusQuery("all", true)).toEqual({
        ok: true,
        statusParam: "all",
        applyPublicIndexable: false,
      });
    });

    it("defaults empty to active without indexable gate", () => {
      expect(resolveListingFeedStatusQuery(undefined, true)).toEqual({
        ok: true,
        statusParam: "active",
        applyPublicIndexable: false,
      });
    });

    it.each([...LISTING_STATUS_ENUM])("allows enum status %s", (status) => {
      expect(resolveListingFeedStatusQuery(status, true)).toEqual({
        ok: true,
        statusParam: status,
        applyPublicIndexable: false,
      });
    });

    it.each(["garbage", "flagged", "ACTIVE", "Active"] as const)(
      "rejects non-enum %j",
      (status) => {
        expect(resolveListingFeedStatusQuery(status, true)).toEqual({
          ok: false,
          error: INVALID_STATUS_ERROR,
        });
      },
    );
  });
});

describe("status query pollution — never first/last wins", () => {
  it.each([
    "status=active&status=all",
    "status=all&status=active",
    "status=deleted&status=active",
    "status=active&status=deleted",
    "status=active&status=all&status=deleted",
    "status[]=deleted",
    "status[0]=deleted&status[1]=active",
    "STATUS=deleted&status=active",
  ])("rejects %s", (qs) => {
    const params = new URLSearchParams(qs);
    // URLSearchParams lowercases? No — STATUS stays. collectStatusQueryValues is case-insensitive on key.
    expect(collectStatusQueryValues(params).length).toBeGreaterThanOrEqual(1);
    expect(resolveListingFeedStatusFromSearchParams(params, false)).toEqual({
      ok: false,
      error: INVALID_STATUS_ERROR,
    });
  });

  it("single status=active still ok", () => {
    expect(
      resolveListingFeedStatusFromSearchParams(new URLSearchParams("status=active"), false),
    ).toEqual({
      ok: true,
      statusParam: "active",
      applyPublicIndexable: true,
    });
  });

  it("encoded all (%61%6c%6c) is rejected for public", () => {
    const params = new URLSearchParams("status=%61%6c%6c");
    expect(resolveListingFeedStatusFromSearchParams(params, false).ok).toBe(false);
  });

  it("status[]=deleted alone is a status value → public 400", () => {
    const params = new URLSearchParams();
    params.append("status[]", "deleted");
    expect(resolveListingFeedStatusFromSearchParams(params, false)).toEqual({
      ok: false,
      error: INVALID_STATUS_ERROR,
    });
  });
});
