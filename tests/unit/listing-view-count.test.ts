/**
 * @jest-environment node
 */

import type { NextRequest } from "next/server";

const analyticsEventWouldDuplicate = jest.fn();
const resolveRateLimit = jest.fn();

jest.mock("@/lib/analytics-dedupe", () => ({
  analyticsEventWouldDuplicate: (...args: unknown[]) =>
    analyticsEventWouldDuplicate(...args),
}));

jest.mock("@/lib/rate-limit-distributed", () => ({
  resolveRateLimit: (...args: unknown[]) => resolveRateLimit(...args),
}));

jest.mock("@/lib/rateLimit", () => ({
  getClientIp: () => "203.0.113.50",
}));

import {
  finalizeShouldCountListingView,
  resolveListingGetRequestLimits,
  shouldIncrementListingView,
  shouldSkipListingViewForAutomation,
} from "@/lib/listing-view-count";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function mockRequest(opts?: {
  sessionId?: string;
  ua?: string | null;
  purpose?: string;
  secPurpose?: string;
  cookie?: string;
}): NextRequest {
  const headers = new Headers();
  if (opts?.sessionId) headers.set("x-analytics-session-id", opts.sessionId);
  if (opts?.ua === null) {
    /* omit UA */
  } else {
    headers.set("user-agent", opts?.ua ?? BROWSER_UA);
  }
  if (opts?.purpose) headers.set("purpose", opts.purpose);
  if (opts?.secPurpose) headers.set("sec-purpose", opts.secPurpose);
  if (opts?.cookie) headers.set("cookie", opts.cookie);
  return new Request("http://localhost/api/listings/abc", { headers }) as NextRequest;
}

describe("listing view count guard", () => {
  beforeEach(() => {
    analyticsEventWouldDuplicate.mockReset();
    resolveRateLimit.mockReset();
    resolveRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
    });
  });

  it("uses session dedupe when x-analytics-session-id is present", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    const ok = await shouldIncrementListingView(mockRequest({ sessionId: "sess-1" }), "listing-1");
    expect(ok).toBe(true);
    expect(analyticsEventWouldDuplicate).toHaveBeenCalledWith({
      eventType: "listing_view",
      sessionId: "sess-1",
      listingId: "listing-1",
    });
  });

  it("skips increment when session dedupe hits (repeated API GET)", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(true);
    const ok = await shouldIncrementListingView(mockRequest({ sessionId: "sess-1" }), "listing-1");
    expect(ok).toBe(false);
  });

  it("uses IP window when session is missing (public, no cookies)", async () => {
    resolveRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 0, resetTime: 0 });
    const ok = await shouldIncrementListingView(mockRequest(), "listing-1");
    expect(ok).toBe(true);
    expect(resolveRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("listing:view:iphash:"),
      expect.objectContaining({ maxRequests: 1 }),
    );
  });

  it("public request with invalid cookies still uses anonymous counting path", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    resolveRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 0, resetTime: 0 });
    const ok = await shouldIncrementListingView(
      mockRequest({ cookie: "accessToken=not-a-valid-jwt" }),
      "listing-1",
    );
    expect(ok).toBe(true);
  });

  it("does not count view when browse rate limit exceeded", async () => {
    resolveRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 1000,
      retryAfter: 60,
    });
    const result = await resolveListingGetRequestLimits(mockRequest({ sessionId: "sess-1" }), "listing-1");
    expect(result.shouldCountView).toBe(false);
    expect(result.allowed).toBe(false);
  });

  it("skips empty UA, curl, bot, purpose prefetch, sec-purpose prefetch", () => {
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: null }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: "curl/8.0" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: "Googlebot/2.1" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ purpose: "prefetch" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ secPurpose: "prefetch" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest())).toBe(false);
  });

  it("browser-normal UA is not skipped by automation filter", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    const result = await resolveListingGetRequestLimits(
      mockRequest({ sessionId: "browser-sess" }),
      "listing-1",
    );
    expect(result.shouldCountView).toBe(true);
  });

  it("finalize: owner/admin never count; normal user can", () => {
    expect(finalizeShouldCountListingView({ shouldCountView: true, isOwnerOrAdmin: true })).toBe(false);
    expect(finalizeShouldCountListingView({ shouldCountView: true, isOwnerOrAdmin: false })).toBe(true);
    expect(finalizeShouldCountListingView({ shouldCountView: false, isOwnerOrAdmin: false })).toBe(false);
  });

  it("limitation: direct API GET with browser UA may still count (cannot distinguish page view)", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    const directApi = await resolveListingGetRequestLimits(
      mockRequest({ sessionId: "api-direct" }),
      "listing-1",
    );
    expect(directApi.shouldCountView).toBe(true);
    expect(
      finalizeShouldCountListingView({
        shouldCountView: directApi.shouldCountView,
        isOwnerOrAdmin: false,
      }),
    ).toBe(true);
  });

  it("concurrent first hits: both can pass gate before analytics row exists (documented race)", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    const [a, b] = await Promise.all([
      shouldIncrementListingView(mockRequest({ sessionId: "race" }), "listing-race"),
      shouldIncrementListingView(mockRequest({ sessionId: "race" }), "listing-race"),
    ]);
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
