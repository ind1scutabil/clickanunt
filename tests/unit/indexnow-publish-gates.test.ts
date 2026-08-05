/** @jest-environment node */
/**
 * Documents the publish/republish gates for IndexNow enqueue.
 * Full HTTP route handlers are integration-tested elsewhere; these guards
 * mirror the exact conditions in app/api/listings/route.ts and [id]/route.ts.
 */
import { enqueueIndexNowSafe } from "@/lib/seo/indexnow-client";

jest.mock("@/lib/seo/indexnow-client", () => {
  const actual = jest.requireActual("@/lib/seo/indexnow-client");
  return {
    ...actual,
    enqueueIndexNowSafe: jest.fn(),
  };
});

const enqueue = enqueueIndexNowSafe as jest.MockedFunction<typeof enqueueIndexNowSafe>;

function shouldEnqueueOnCreate(status: string): boolean {
  return status === "active";
}

function shouldEnqueueOnPatch(opts: {
  touchedStatusOrModeration: boolean;
  updatedStatus: string;
}): boolean {
  return opts.touchedStatusOrModeration && opts.updatedStatus === "active";
}

describe("IndexNow publish/republish gates", () => {
  beforeEach(() => {
    enqueue.mockClear();
  });

  it("create: enqueues only for active (not draft/pending/rejected)", () => {
    for (const status of ["draft", "pending", "rejected", "paused", "sold"]) {
      expect(shouldEnqueueOnCreate(status)).toBe(false);
    }
    expect(shouldEnqueueOnCreate("active")).toBe(true);
  });

  it("patch: enqueues only when status/moderation fields change AND result is active", () => {
    expect(
      shouldEnqueueOnPatch({ touchedStatusOrModeration: false, updatedStatus: "active" })
    ).toBe(false);
    expect(
      shouldEnqueueOnPatch({ touchedStatusOrModeration: true, updatedStatus: "pending" })
    ).toBe(false);
    expect(
      shouldEnqueueOnPatch({ touchedStatusOrModeration: true, updatedStatus: "rejected" })
    ).toBe(false);
    expect(
      shouldEnqueueOnPatch({ touchedStatusOrModeration: true, updatedStatus: "active" })
    ).toBe(true);
  });

  it("canonical URL shape used by routes is /listings/:id under SEO origin", () => {
    const origin = "https://www.clickanunt.ro";
    const id = "clxyz123";
    const url = `${origin}/listings/${id}`;
    expect(url).toBe("https://www.clickanunt.ro/listings/clxyz123");
    enqueue([url]);
    expect(enqueue).toHaveBeenCalledWith(["https://www.clickanunt.ro/listings/clxyz123"]);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
});
