import {
  USER_NOTIFICATION_TITLES,
  buildListingPromotionNotification,
} from "@/lib/user-notifications";

describe("user-notifications", () => {
  const expires = new Date("2026-06-15T12:00:00.000Z");

  it("builds promoted message for new promotion", () => {
    const built = buildListingPromotionNotification({
      userId: "u1",
      listingTitle: "BMW Seria 3",
      promotionExpiresAt: expires,
      wasPromoted: false,
      previousPromotionExpiresAt: null,
    });

    expect(built).not.toBeNull();
    expect(built?.title).toBe(USER_NOTIFICATION_TITLES.listingPromoted);
    expect(built?.message).toContain("BMW Seria 3");
    expect(built?.message).toContain("a fost promovat");
  });

  it("builds updated message when expiry changes on already promoted listing", () => {
    const prev = new Date("2026-05-01T00:00:00.000Z");
    const built = buildListingPromotionNotification({
      userId: "u1",
      listingTitle: "Audi A4",
      promotionExpiresAt: expires,
      wasPromoted: true,
      previousPromotionExpiresAt: prev,
    });

    expect(built?.title).toBe(USER_NOTIFICATION_TITLES.promotionUpdated);
    expect(built?.message).toContain("este activă până la");
  });

  it("returns null when promotion expiry unchanged (no duplicate)", () => {
    const built = buildListingPromotionNotification({
      userId: "u1",
      listingTitle: "VW Golf",
      promotionExpiresAt: expires,
      wasPromoted: true,
      previousPromotionExpiresAt: expires,
    });

    expect(built).toBeNull();
  });

  it("includes formatted expiry date in Romanian locale", () => {
    const built = buildListingPromotionNotification({
      userId: "u1",
      listingTitle: "Test",
      promotionExpiresAt: expires,
      wasPromoted: false,
      previousPromotionExpiresAt: null,
    });

    expect(built?.message).toMatch(/\d/);
  });
});
