/** @jest-environment node */
import {
  INDEXNOW_PUBLIC_LISTING_FIELDS,
  listingIndexNowUrl,
  notifyListingIndexNowAfterSuccess,
  shouldNotifyListingIndexNow,
} from "@/lib/seo/indexnow-listing-notify";
import { enqueueIndexNowSafe } from "@/lib/seo/indexnow-client";
import { buildWebCreatePayload } from "@/lib/listing-create-payload-builders";
import { listingCreateSchema } from "@/lib/security/validation-schemas";

jest.mock("@/lib/seo/indexnow-client", () => {
  const actual = jest.requireActual("@/lib/seo/indexnow-client");
  return {
    ...actual,
    enqueueIndexNowSafe: jest.fn(),
  };
});

const enqueue = enqueueIndexNowSafe as jest.MockedFunction<typeof enqueueIndexNowSafe>;

describe("IndexNow listing notify helper", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    enqueue.mockClear();
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("create valid → active → exactly one enqueue", () => {
    const fixture = listingCreateSchema.parse(buildWebCreatePayload());
    expect(fixture).toBeTruthy();

    const notified = notifyListingIndexNowAfterSuccess({
      listingId: "11111111-1111-4111-8111-111111111111",
      before: { status: "pending", deletedAt: null },
      after: { status: "active", deletedAt: null },
      changedKeys: ["status"],
    });
    expect(notified).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith([
      "https://www.clickanunt.ro/listings/11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("create pending → zero", () => {
    expect(
      notifyListingIndexNowAfterSuccess({
        listingId: "a",
        before: { status: "pending", deletedAt: null },
        after: { status: "pending", deletedAt: null },
        changedKeys: ["status"],
      })
    ).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("owner reactivate → pending → zero", () => {
    expect(
      shouldNotifyListingIndexNow({
        before: { status: "paused", deletedAt: null },
        after: { status: "pending", deletedAt: null },
        changedKeys: ["status", "moderationStatus"],
      })
    ).toBe(false);
  });

  it("admin approve pending → active → one", () => {
    expect(
      notifyListingIndexNowAfterSuccess({
        listingId: "b",
        before: { status: "pending", deletedAt: null },
        after: { status: "active", deletedAt: null },
        changedKeys: ["status", "moderationStatus"],
      })
    ).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("admin reactivate paused → active → one", () => {
    expect(
      notifyListingIndexNowAfterSuccess({
        listingId: "c",
        before: { status: "paused", deletedAt: null },
        after: { status: "active", deletedAt: null },
        changedKeys: ["status", "moderationStatus"],
      })
    ).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("edit title/price/description on active → one", () => {
    for (const field of ["title", "priceAmount", "description"] as const) {
      enqueue.mockClear();
      expect(
        notifyListingIndexNowAfterSuccess({
          listingId: "d",
          before: { status: "active", deletedAt: null },
          after: { status: "active", deletedAt: null },
          changedKeys: [field],
        })
      ).toBe(true);
      expect(enqueue).toHaveBeenCalledTimes(1);
    }
  });

  it("edit on pending/rejected → zero", () => {
    for (const status of ["pending", "rejected"]) {
      expect(
        shouldNotifyListingIndexNow({
          before: { status, deletedAt: null },
          after: { status, deletedAt: null },
          changedKeys: ["title", "description"],
        })
      ).toBe(false);
    }
  });

  it("update without public field change on already-active → zero", () => {
    expect(
      shouldNotifyListingIndexNow({
        before: { status: "active", deletedAt: null },
        after: { status: "active", deletedAt: null },
        changedKeys: ["moderatedAt", "moderatedBy", "moderationNotes", "status"],
      })
    ).toBe(false);
    expect(INDEXNOW_PUBLIC_LISTING_FIELDS.has("moderationNotes")).toBe(false);
    expect(INDEXNOW_PUBLIC_LISTING_FIELDS.has("status")).toBe(false);
  });

  it("draft/rejected/private(deleted) → zero", () => {
    expect(
      shouldNotifyListingIndexNow({
        before: { status: "draft", deletedAt: null },
        after: { status: "draft", deletedAt: null },
        changedKeys: ["status"],
      })
    ).toBe(false);
    expect(
      shouldNotifyListingIndexNow({
        before: { status: "active", deletedAt: null },
        after: { status: "active", deletedAt: new Date() },
        changedKeys: ["title"],
      })
    ).toBe(false);
  });

  it("never double-enqueues in a single helper call", () => {
    notifyListingIndexNowAfterSuccess({
      listingId: "e",
      before: { status: "pending", deletedAt: null },
      after: { status: "active", deletedAt: null },
      changedKeys: ["status", "title", "description", "photos"],
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("listingIndexNowUrl is canonical", () => {
    expect(listingIndexNowUrl("xyz")).toBe("https://www.clickanunt.ro/listings/xyz");
  });
});
