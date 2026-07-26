/**
 * Canonical subscription tier helpers.
 * Keep separate from UserRole / AccountType / verification / admin access.
 */

export const SUBSCRIPTION_TIERS = ["free", "business", "premium"] as const;

export type KnownSubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

const TIER_LABELS: Record<KnownSubscriptionTier, string> = {
  free: "Gratuit",
  business: "Business",
  premium: "Premium",
};

export function isKnownSubscriptionTier(
  value: unknown
): value is KnownSubscriptionTier {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_TIERS as readonly string[]).includes(value)
  );
}

/**
 * Normalize DB/API/legacy values to a known tier.
 * null, undefined, unknown → free (real free level).
 */
export function normalizeSubscriptionTier(
  value: unknown
): KnownSubscriptionTier {
  if (isKnownSubscriptionTier(value)) return value;
  return "free";
}

export function subscriptionTierLabel(value: unknown): string {
  return TIER_LABELS[normalizeSubscriptionTier(value)];
}

/** Paid / commercial account tiers that get a non-free badge in seller UI. */
export function isPaidSubscriptionTier(value: unknown): boolean {
  const tier = normalizeSubscriptionTier(value);
  return tier === "business" || tier === "premium";
}

/** Show Business discovery CTA for free / unknown / legacy only. */
export function shouldOfferBusinessDiscovery(value: unknown): boolean {
  return normalizeSubscriptionTier(value) === "free";
}
