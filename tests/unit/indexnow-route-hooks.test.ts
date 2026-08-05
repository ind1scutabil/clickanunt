/** @jest-environment node */
/**
 * Controlled route-hook simulations for IndexNow (owner create/update + admin paths).
 * Mocks enqueue at the shared helper boundary so routes cannot diverge.
 */
import { notifyListingIndexNowAfterSuccess } from "@/lib/seo/indexnow-listing-notify";
import { enqueueIndexNowSafe } from "@/lib/seo/indexnow-client";
import { buildWebCreatePayload, buildWebAutoCreatePayload } from "@/lib/listing-create-payload-builders";
import { listingCreateSchema } from "@/lib/security/validation-schemas";

jest.mock("@/lib/seo/indexnow-client", () => {
  const actual = jest.requireActual("@/lib/seo/indexnow-client");
  return {
    ...actual,
    enqueueIndexNowSafe: jest.fn(),
  };
});

const enqueue = enqueueIndexNowSafe as jest.MockedFunction<typeof enqueueIndexNowSafe>;

/** Mirrors POST /api/listings after prisma.listing.create succeeds. */
function afterOwnerCreate(listing: { id: string; status: string; deletedAt?: Date | null }) {
  return notifyListingIndexNowAfterSuccess({
    listingId: listing.id,
    before: { status: "pending", deletedAt: null },
    after: { status: listing.status, deletedAt: listing.deletedAt ?? null },
    changedKeys: ["status"],
  });
}

/** Mirrors PATCH /api/listings/:id after successful update. */
function afterOwnerOrAdminListingPatch(opts: {
  id: string;
  beforeStatus: string;
  afterStatus: string;
  beforeDeletedAt?: Date | null;
  afterDeletedAt?: Date | null;
  changedKeys: string[];
}) {
  return notifyListingIndexNowAfterSuccess({
    listingId: opts.id,
    before: { status: opts.beforeStatus, deletedAt: opts.beforeDeletedAt ?? null },
    after: { status: opts.afterStatus, deletedAt: opts.afterDeletedAt ?? null },
    changedKeys: opts.changedKeys,
  });
}

/** Mirrors admin moderation approve / admin listings activate. */
function afterAdminActivate(opts: {
  id: string;
  beforeStatus: string;
  becameActive: boolean;
}) {
  return notifyListingIndexNowAfterSuccess({
    listingId: opts.id,
    before: { status: opts.beforeStatus, deletedAt: null },
    after: { status: "active", deletedAt: null },
    changedKeys: opts.becameActive
      ? ["status", "moderationStatus"]
      : ["moderationStatus", "moderatedAt", "moderatedBy"],
  });
}

describe("IndexNow route hook simulations", () => {
  beforeEach(() => {
    enqueue.mockClear();
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
  });

  it("owner create with valid taxonomy/photos fixture → active → 1 call", () => {
    const web = listingCreateSchema.parse(buildWebCreatePayload());
    const auto = listingCreateSchema.parse(buildWebAutoCreatePayload());
    expect(web.photos?.length).toBeGreaterThan(0);
    expect(auto.photos?.length).toBeGreaterThan(0);

    const listing = {
      id: "22222222-2222-4222-8222-222222222222",
      status: "active",
      deletedAt: null,
      ...web,
    };
    expect(afterOwnerCreate(listing)).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toEqual([
      `https://www.clickanunt.ro/listings/${listing.id}`,
    ]);
  });

  it("owner create pending → 0", () => {
    expect(afterOwnerCreate({ id: "p1", status: "pending" })).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("owner reactivate → pending → 0", () => {
    expect(
      afterOwnerOrAdminListingPatch({
        id: "r1",
        beforeStatus: "paused",
        afterStatus: "pending",
        changedKeys: ["status", "moderationStatus"],
      })
    ).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("admin approve pending → active → 1", () => {
    expect(afterAdminActivate({ id: "a1", beforeStatus: "pending", becameActive: true })).toBe(
      true
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("admin reactivate → active → 1", () => {
    expect(afterAdminActivate({ id: "a2", beforeStatus: "paused", becameActive: true })).toBe(
      true
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("admin idempotent approve already-active → 0", () => {
    expect(afterAdminActivate({ id: "a3", beforeStatus: "active", becameActive: false })).toBe(
      false
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("edit title on active → 1; edit on pending → 0", () => {
    expect(
      afterOwnerOrAdminListingPatch({
        id: "e1",
        beforeStatus: "active",
        afterStatus: "active",
        changedKeys: ["title"],
      })
    ).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
    enqueue.mockClear();
    expect(
      afterOwnerOrAdminListingPatch({
        id: "e2",
        beforeStatus: "pending",
        afterStatus: "pending",
        changedKeys: ["title"],
      })
    ).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
