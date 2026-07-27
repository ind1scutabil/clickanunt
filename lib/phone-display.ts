/**
 * Seller listing contact phone — display/tel helpers + reveal eligibility.
 * Never invent digits for legacy invalid values.
 */
import {
  isListingPromotionEligible,
  type ListingLifecycleShape,
} from "@/lib/listing-lifecycle";

const PHONE_DISPLAY_RE = /^[0-9+\-\s().]{7,32}$/;

export type PhoneRevealListing = ListingLifecycleShape & {
  id: string;
  contactPhone?: string | null;
  owner?: { isBanned?: boolean | null; deletedAt?: Date | string | null } | null;
};

/** True when a listing may reveal contactPhone to the public (same core as public browse). */
export function isListingPhoneRevealEligible(
  listing: ListingLifecycleShape,
  now: Date = new Date()
): boolean {
  return isListingPromotionEligible(listing, now);
}

/**
 * Normalize raw contactPhone for reveal. Returns null if empty/invalid (no invention).
 */
export function normalizeContactPhoneForReveal(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!PHONE_DISPLAY_RE.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return trimmed;
}

/** Safe tel: href — digits only (+ optional leading +). Rejects javascript: / control chars. */
export function phoneToTelHref(phone: string): string {
  const t = phone.trim();
  if (!t) return "";
  if (/[<>"'`]/.test(t) || /javascript:/i.test(t)) return "";
  if (t.startsWith("+")) {
    const rest = t.slice(1).replace(/\D/g, "");
    return rest.length >= 7 ? `+${rest}` : "";
  }
  const digits = t.replace(/\D/g, "");
  return digits.length >= 7 ? digits : "";
}

/** Afișare lizibilă (păstrează formatarea userului după trim). */
export function formatPhoneDisplay(phone: string): string {
  return phone.trim() || "";
}

export function listingHasContactPhone(listing: { contactPhone?: unknown }): boolean {
  return normalizeContactPhoneForReveal(listing.contactPhone) != null;
}
