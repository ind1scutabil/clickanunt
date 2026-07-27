/**
 * Public API privacy + cache headers — no real emails in assertions (use property absence).
 */
import { test, expect } from "@playwright/test";
import {
  PUBLIC_FORBIDDEN_LISTING_KEYS,
  PUBLIC_FORBIDDEN_OWNER_KEYS,
  PUBLIC_LISTING_KEYS,
  PUBLIC_OWNER_KEYS,
} from "../../lib/listings/public-listing-dto";

function assertPublicListingShape(listing: Record<string, unknown>) {
  for (const key of Object.keys(listing)) {
    expect(PUBLIC_LISTING_KEYS as readonly string[]).toContain(key);
  }
  for (const key of PUBLIC_FORBIDDEN_LISTING_KEYS) {
    expect(listing).not.toHaveProperty(key);
  }
  if (listing.owner && typeof listing.owner === "object") {
    const owner = listing.owner as Record<string, unknown>;
    for (const key of Object.keys(owner)) {
      expect(PUBLIC_OWNER_KEYS as readonly string[]).toContain(key);
    }
    for (const key of PUBLIC_FORBIDDEN_OWNER_KEYS) {
      expect(owner).not.toHaveProperty(key);
    }
  }
}

function assertPrivateApiCache(headers: Record<string, string>) {
  const cc = (headers["cache-control"] || "").toLowerCase();
  expect(cc).toMatch(/private/);
  expect(cc).toMatch(/no-store/);
  expect(cc).not.toMatch(/public/);
  const vary = (headers["vary"] || "").toLowerCase();
  expect(vary).toMatch(/cookie/);
  expect(vary).toMatch(/authorization/);
}

test.describe("Public listing API privacy", () => {
  test("GET /api/listings/[id] anonymous has no owner.email + private cache", async ({
    request,
  }) => {
    const list = await request.get("/api/listings?status=active&limit=1");
    expect(list.ok()).toBeTruthy();
    assertPrivateApiCache(list.headers());
    const body = await list.json();
    const rows = body.data || body.listings || [];
    test.skip(rows.length === 0, "no listings");
    const id = rows[0].id as string;

    const res = await request.get(`/api/listings/${id}`, {
      headers: { "user-agent": "Mozilla/5.0 ClickAnuntPrivacyTest/1.0" },
    });
    expect(res.ok()).toBeTruthy();
    assertPrivateApiCache(res.headers());
    const listing = await res.json();
    assertPublicListingShape(listing);
    expect(listing.owner?.email).toBeUndefined();
    expect(listing.owner?.phone).toBeUndefined();
    expect(listing.owner?.businessPhone).toBeUndefined();
    expect(listing.moderationNotes).toBeUndefined();
    expect(listing.scamFlags).toBeUndefined();
    expect(listing.contactPhone).toBeUndefined();
    expect(typeof listing.hasContactPhone === "boolean" || listing.hasContactPhone === undefined).toBe(
      true
    );
  });

  test("GET /api/listings list rows have no owner.email + private cache", async ({ request }) => {
    const res = await request.get("/api/listings?status=active&limit=5");
    expect(res.ok()).toBeTruthy();
    assertPrivateApiCache(res.headers());
    const body = await res.json();
    const rows = body.data || body.listings || [];
    for (const row of rows) {
      assertPublicListingShape(row);
      expect(row.owner?.email).toBeUndefined();
      expect(row.moderationNotes).toBeUndefined();
    }
  });

  test("invalid session cookie is treated as public (no 500, no owner PII)", async ({
    request,
  }) => {
    const list = await request.get("/api/listings?status=active&limit=1");
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = body.data || body.listings || [];
    test.skip(rows.length === 0, "no listings");
    const id = rows[0].id as string;

    const res = await request.get(`/api/listings/${id}`, {
      headers: {
        "user-agent": "Mozilla/5.0 ClickAnuntPrivacyTest/1.0",
        cookie: "accessToken=not-a-valid-jwt.payload.sig",
      },
    });
    expect(res.status()).not.toBe(500);
    expect(res.ok()).toBeTruthy();
    assertPrivateApiCache(res.headers());
    const listing = await res.json();
    assertPublicListingShape(listing);
    expect(listing.owner?.email).toBeUndefined();
    expect(listing.moderationNotes).toBeUndefined();
  });
});
