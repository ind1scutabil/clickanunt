/** @jest-environment node */
import { createRefreshSingleFlight } from "../../apps/mobile/src/api/refreshSingleFlight";
import {
  consumePendingListingDeepLink,
  peekPendingListingDeepLink,
  __setPendingListingDeepLinkForTests,
} from "../../apps/mobile/src/auth/pending-listing-deep-link";

describe("createRefreshSingleFlight", () => {
  it("runs the refresh body only once for concurrent callers", async () => {
    let calls = 0;
    const refresh = createRefreshSingleFlight(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, accessToken: "a1", refreshToken: "r1" };
    });

    const [a, b, c] = await Promise.all([refresh(), refresh(), refresh()]);
    expect(a && b && c).toBe(true);
    expect(calls).toBe(1);
  });

  it("allows a second wave after the first settles", async () => {
    let calls = 0;
    const refresh = createRefreshSingleFlight(async () => {
      calls += 1;
      return { ok: true, accessToken: `a${calls}` };
    });
    await refresh();
    await refresh();
    expect(calls).toBe(2);
  });
});

describe("pending listing deep link", () => {
  it("stores and consumes once after login handoff", () => {
    __setPendingListingDeepLinkForTests("listing-abc12345");
    expect(peekPendingListingDeepLink().id).toBe("listing-abc12345");
    expect(consumePendingListingDeepLink()).toBe("listing-abc12345");
    expect(consumePendingListingDeepLink()).toBeNull();
  });
});
