/** @jest-environment node */
import {
  isKnownSubscriptionTier,
  isPaidSubscriptionTier,
  normalizeSubscriptionTier,
  shouldOfferBusinessDiscovery,
  subscriptionTierLabel,
  SUBSCRIPTION_TIERS,
} from "@/lib/subscription-tier";

describe("subscription-tier helpers", () => {
  it("exposes only the known Prisma enum tiers", () => {
    expect([...SUBSCRIPTION_TIERS]).toEqual(["free", "business", "premium"]);
  });

  it("normalizes null / unknown / legacy to free", () => {
    expect(normalizeSubscriptionTier(null)).toBe("free");
    expect(normalizeSubscriptionTier(undefined)).toBe("free");
    expect(normalizeSubscriptionTier("")).toBe("free");
    expect(normalizeSubscriptionTier("pro")).toBe("free");
    expect(normalizeSubscriptionTier("Administrator")).toBe("free");
    expect(normalizeSubscriptionTier(123)).toBe("free");
  });

  it("keeps each known tier", () => {
    expect(normalizeSubscriptionTier("free")).toBe("free");
    expect(normalizeSubscriptionTier("business")).toBe("business");
    expect(normalizeSubscriptionTier("premium")).toBe("premium");
  });

  it("labels tiers without exposing UserRole names", () => {
    expect(subscriptionTierLabel("free")).toBe("Gratuit");
    expect(subscriptionTierLabel("business")).toBe("Business");
    expect(subscriptionTierLabel("premium")).toBe("Premium");
    expect(subscriptionTierLabel(null)).toBe("Gratuit");
    expect(subscriptionTierLabel("admin")).toBe("Gratuit");
  });

  it("paid / discovery flags", () => {
    expect(isPaidSubscriptionTier("free")).toBe(false);
    expect(isPaidSubscriptionTier(null)).toBe(false);
    expect(isPaidSubscriptionTier("business")).toBe(true);
    expect(isPaidSubscriptionTier("premium")).toBe(true);
    expect(shouldOfferBusinessDiscovery("free")).toBe(true);
    expect(shouldOfferBusinessDiscovery(null)).toBe(true);
    expect(shouldOfferBusinessDiscovery("business")).toBe(false);
    expect(shouldOfferBusinessDiscovery("premium")).toBe(false);
  });

  it("isKnownSubscriptionTier", () => {
    expect(isKnownSubscriptionTier("premium")).toBe(true);
    expect(isKnownSubscriptionTier("user")).toBe(false);
  });
});
