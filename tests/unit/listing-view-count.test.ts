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
  resolveListingGetRequestLimits,
  shouldIncrementListingView,
} from "@/lib/listing-view-count";

function mockRequest(sessionId?: string): NextRequest {
  const headers = new Headers();
  if (sessionId) headers.set("x-analytics-session-id", sessionId);
  return new Request("http://localhost/api/listings/abc", { headers }) as NextRequest;
}

describe("listing view count guard", () => {
  beforeEach(() => {
    analyticsEventWouldDuplicate.mockReset();
    resolveRateLimit.mockReset();
    resolveRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetTime: Date.now() + 60000 });
  });

  it("uses session dedupe when x-analytics-session-id is present", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    const ok = await shouldIncrementListingView(mockRequest("sess-1"), "listing-1");
    expect(ok).toBe(true);
    expect(analyticsEventWouldDuplicate).toHaveBeenCalledWith({
      eventType: "listing_view",
      sessionId: "sess-1",
      listingId: "listing-1",
    });
    expect(resolveRateLimit).not.toHaveBeenCalled();
  });

  it("skips increment when session dedupe hits", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(true);
    const ok = await shouldIncrementListingView(mockRequest("sess-1"), "listing-1");
    expect(ok).toBe(false);
  });

  it("uses IP window when session is missing", async () => {
    analyticsEventWouldDuplicate.mockResolvedValue(false);
    resolveRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 0, resetTime: 0 });
    const ok = await shouldIncrementListingView(mockRequest(), "listing-1");
    expect(ok).toBe(true);
    expect(resolveRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("listing:view:iphash:"),
      expect.objectContaining({ maxRequests: 1 })
    );
  });

  it("does not count view when browse rate limit exceeded", async () => {
    resolveRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 1000,
      retryAfter: 60,
    });
    const result = await resolveListingGetRequestLimits(mockRequest("sess-1"), "listing-1");
    expect(result.shouldCountView).toBe(false);
    expect(result.allowed).toBe(false);
  });
});
