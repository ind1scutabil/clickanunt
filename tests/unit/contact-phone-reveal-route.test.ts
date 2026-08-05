/** @jest-environment node */
/**
 * GET /api/listings/[id]/contact-phone — eligibility, rate limit, no PII in errors.
 */
import { NextRequest } from "next/server";

const mockFindUnique = jest.fn();
const mockResolveRateLimit = jest.fn();
const mockAuth = jest.fn();
const mockAnalytics = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
  },
}));

jest.mock("@/lib/rate-limit-distributed", () => ({
  resolveRateLimit: (...a: unknown[]) => mockResolveRateLimit(...a),
}));

jest.mock("@/lib/messages-request-auth", () => ({
  getMessagingApiAuthPayload: (...a: unknown[]) => mockAuth(...a),
}));

jest.mock("@/lib/analytics-events", () => ({
  ANALYTICS_EVENT: { listing_contact_click: "listing_contact_click" },
  recordAnalyticsEvent: (...a: unknown[]) => mockAnalytics(...a),
}));

jest.mock("@/lib/cloudflare/config", () => ({
  getRealIP: () => "203.0.113.10",
}));

import { GET } from "@/app/api/listings/[id]/contact-phone/route";

const listingId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function getPhone(id = listingId) {
  return GET(new NextRequest(`http://localhost/api/listings/${id}/contact-phone`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/listings/[id]/contact-phone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockResolveRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 39,
      resetTime: Date.now() + 60_000,
    });
    mockFindUnique.mockResolvedValue({
      id: listingId,
      contactPhone: "0712345678",
      status: "active",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
      ownerUserId: ownerId,
      owner: { isBanned: false, deletedAt: null },
    });
  });

  it("returns phone for public-eligible listing", async () => {
    const res = await getPhone();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasPhone).toBe(true);
    expect(body.phone).toBe("0712345678");
    expect(body.telHref).toBe("0712345678");
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
    expect(res.headers.get("X-Robots-Tag")).toMatch(/noindex/);
    expect(JSON.stringify(body)).not.toMatch(/ownerUserId|email/);
  });

  it("rejects paused listing for anonymous", async () => {
    mockFindUnique.mockResolvedValue({
      id: listingId,
      contactPhone: "0712345678",
      status: "paused",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
      ownerUserId: ownerId,
      owner: { isBanned: false, deletedAt: null },
    });
    const res = await getPhone();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/indisponibil/i);
    expect(body.phone).toBeUndefined();
  });

  it("returns 429 when rate limited", async () => {
    mockResolveRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60_000,
      retryAfter: 120,
    });
    const res = await getPhone();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    const body = await res.json();
    expect(body.phone).toBeUndefined();
  });

  it("rejects invalid phone without inventing digits", async () => {
    mockFindUnique.mockResolvedValue({
      id: listingId,
      contactPhone: "12",
      status: "active",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
      ownerUserId: ownerId,
      owner: { isBanned: false, deletedAt: null },
    });
    const res = await getPhone();
    expect(res.status).toBe(404);
    expect((await res.json()).phone).toBeUndefined();
  });

  it("rejects invalid listing id", async () => {
    const res = await getPhone("not-a-uuid");
    expect(res.status).toBe(400);
  });
});
