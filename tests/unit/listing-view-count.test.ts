/**
 * @jest-environment node
 */

import type { NextRequest } from "next/server";

const resolveRateLimit = jest.fn();

jest.mock("@/lib/rate-limit-distributed", () => ({
  resolveRateLimit: (...args: unknown[]) => resolveRateLimit(...args),
}));

jest.mock("@/lib/rateLimit", () => ({
  getClientIp: () => "203.0.113.50",
}));

import {
  finalizeShouldCountListingView,
  resolveListingGetBrowseLimit,
  shouldSkipListingViewForAutomation,
} from "@/lib/listing-view-count";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function mockRequest(opts?: {
  sessionId?: string;
  ua?: string | null;
  purpose?: string;
  secPurpose?: string;
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
  return new Request("http://localhost/api/listings/abc", { headers }) as NextRequest;
}

describe("listing view guards", () => {
  beforeEach(() => {
    resolveRateLimit.mockReset();
    resolveRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
    });
  });

  it("skips empty UA, curl, bot, purpose prefetch, sec-purpose prefetch", () => {
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: null }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: "curl/8.0" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ ua: "Googlebot/2.1" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ purpose: "prefetch" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest({ secPurpose: "prefetch" }))).toBe(true);
    expect(shouldSkipListingViewForAutomation(mockRequest())).toBe(false);
  });

  it("GET browse limit never consumes a view dedupe slot", async () => {
    await resolveListingGetBrowseLimit(mockRequest({ sessionId: "sess-1" }));

    expect(resolveRateLimit).toHaveBeenCalledTimes(1);
    const [key] = resolveRateLimit.mock.calls[0] as [string, unknown];
    expect(key).toBe("listing:get:ip:203.0.113.50");
    // Anything under listing:view:* belongs to the beacon, not the read path.
    for (const call of resolveRateLimit.mock.calls) {
      expect(String(call[0])).not.toContain("listing:view:");
    }
  });

  it("GET browse limit reports rate limiting without blocking the payload", async () => {
    resolveRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 1000,
      retryAfter: 60,
    });
    const result = await resolveListingGetBrowseLimit(mockRequest());
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });

  it("finalize: owner/admin never count; normal user can", () => {
    expect(finalizeShouldCountListingView({ shouldCountView: true, isOwnerOrAdmin: true })).toBe(false);
    expect(finalizeShouldCountListingView({ shouldCountView: true, isOwnerOrAdmin: false })).toBe(true);
    expect(finalizeShouldCountListingView({ shouldCountView: false, isOwnerOrAdmin: false })).toBe(false);
  });
});
