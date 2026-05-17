import {
  LISTING_STANDARD_DURATION_DAYS,
  applyListingPublishExpiryIfMissing,
  calculateListingExpiryDate,
  formatListingExpiryDateRO,
  formatListingExpiryDisplay,
  isListingDateExpired,
  isListingExplicitlyExpired,
  listingPublishExpiryFields,
  resolveListingExpiresAt,
} from "@/lib/listing-expiry";

describe("listing-expiry", () => {
  const base = new Date("2026-01-01T12:00:00.000Z");

  it("calculateListingExpiryDate adds standard duration", () => {
    const exp = calculateListingExpiryDate(base);
    expect(exp.getTime() - base.getTime()).toBe(
      LISTING_STANDARD_DURATION_DAYS * 24 * 60 * 60 * 1000
    );
  });

  it("listingPublishExpiryFields sets publishedAt and expiresAt +30 days", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const { publishedAt, expiresAt } = listingPublishExpiryFields(now);
    expect(publishedAt).toEqual(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("applyListingPublishExpiryIfMissing preserves existing dates", () => {
    const publishedAt = new Date("2025-06-01T00:00:00.000Z");
    const expiresAt = new Date("2025-07-01T00:00:00.000Z");
    expect(applyListingPublishExpiryIfMissing({ publishedAt, expiresAt })).toEqual({});
  });

  it("applyListingPublishExpiryIfMissing fills only missing fields", () => {
    const publishedAt = new Date("2025-06-01T00:00:00.000Z");
    const patch = applyListingPublishExpiryIfMissing({ publishedAt, expiresAt: null });
    expect(patch.publishedAt).toBeUndefined();
    expect(patch.expiresAt).toBeInstanceOf(Date);
  });

  it("resolveListingExpiresAt uses expiresAt when set", () => {
    const expiresAt = new Date("2026-03-15T00:00:00.000Z");
    expect(
      resolveListingExpiresAt({
        expiresAt,
        createdAt: new Date("2020-01-01"),
      }).getTime()
    ).toBe(expiresAt.getTime());
  });

  it("resolveListingExpiresAt falls back to createdAt + 30 days", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const resolved = resolveListingExpiresAt({ createdAt });
    expect(resolved.getTime() - createdAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("isListingExplicitlyExpired is false when expiresAt is null", () => {
    expect(isListingExplicitlyExpired({ expiresAt: null })).toBe(false);
    expect(
      isListingExplicitlyExpired(
        { expiresAt: null },
        new Date("2030-01-01")
      )
    ).toBe(false);
  });

  it("isListingExplicitlyExpired is true when stored expiresAt is past", () => {
    expect(
      isListingExplicitlyExpired(
        { expiresAt: new Date("2020-01-01") },
        new Date("2026-01-01")
      )
    ).toBe(true);
  });

  it("isListingDateExpired uses fallback for null expiresAt", () => {
    const createdAt = new Date("2020-01-01T00:00:00.000Z");
    expect(
      isListingDateExpired({ createdAt, expiresAt: null }, new Date("2026-01-01"))
    ).toBe(true);
  });

  it("listing expiry is independent of promotionExpiresAt field", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const promotionExpiresAt = new Date("2026-01-08T00:00:00.000Z");
    const resolved = resolveListingExpiresAt({
      expiresAt: null,
      createdAt,
      publishedAt: createdAt,
    });
    expect(resolved.getTime()).not.toBe(promotionExpiresAt.getTime());
    expect(resolved.getTime() - createdAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("formatListingExpiryDisplay returns Romanian date string", () => {
    const display = formatListingExpiryDisplay({
      expiresAt: new Date("2026-06-15T12:00:00.000Z"),
    });
    expect(display).toMatch(/2026/);
    expect(formatListingExpiryDateRO(new Date("2026-06-15T12:00:00.000Z"))).toBe(display);
  });
});
