/**
 * GA4 marketplace event catalog — consent-gated client helper.
 * No email, phone, name, message body, JWT, or raw PII.
 */
export const MARKETPLACE_GA4_EVENT = {
  search_submitted: "search_submitted",
  filter_applied: "filter_applied",
  listing_view: "listing_view",
  listing_contact_message: "listing_contact_message",
  listing_contact_phone_reveal: "listing_contact_phone_reveal",
  favorite_added: "favorite_added",
  favorite_removed: "favorite_removed",
  share_clicked: "share_clicked",
  seller_profile_viewed: "seller_profile_viewed",
  publish_started: "publish_started",
  publish_step_completed: "publish_step_completed",
  publish_failed: "publish_failed",
  listing_submitted: "listing_submitted",
  listing_approved: "listing_approved",
  promotion_viewed: "promotion_viewed",
  promotion_checkout_started: "promotion_checkout_started",
  promotion_confirmed: "promotion_confirmed",
} as const;

export type MarketplaceGa4EventName =
  (typeof MARKETPLACE_GA4_EVENT)[keyof typeof MARKETPLACE_GA4_EVENT];

const FORBIDDEN_PARAM_KEYS = new Set([
  "email",
  "phone",
  "name",
  "message",
  "token",
  "jwt",
  "password",
  "address",
  "userId",
  "user_id",
  "contactPhone",
  "ownerEmail",
]);

export type MarketplaceGa4Params = Record<string, string | number | boolean | undefined>;

/** Strip forbidden keys and truncate string values. */
export function sanitizeMarketplaceGa4Params(
  params: MarketplaceGa4Params | undefined
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [k, v] of Object.entries(params)) {
    if (FORBIDDEN_PARAM_KEYS.has(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string") {
      out[k] = v.slice(0, 100);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Client-only: send GA4 event if gtag is present (after consent).
 * No-op in SSR / when GA script is absent.
 */
export function trackMarketplaceGa4Event(
  name: MarketplaceGa4EventName,
  params?: MarketplaceGa4Params
): void {
  if (typeof window === "undefined") return;
  const payload = sanitizeMarketplaceGa4Params(params);
  if (process.env.NEXT_PUBLIC_GA4_DEBUG === "true") {
    console.debug("[ga4-marketplace]", name, payload);
  }
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, payload);
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
