/**
 * Helpers for listing detail Product + Offer JSON-LD (classified marketplace).
 * No fabricated reviews, GTIN, shipping, or return promises.
 */

import { absoluteUrl } from "@/lib/site-url";

/** ISO 3779-style VIN: 17 chars, excludes I, O, Q. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function isValidListingVin(vin: string | null | undefined): boolean {
  if (!vin) return false;
  const t = vin.trim();
  return t.length === 17 && VIN_RE.test(t);
}

/**
 * Classified listings: pickup / local arrangement between users — not platform shipping.
 * @see https://schema.org/OnSitePickup
 */
export const CLASSIFIED_OFFER_DELIVERY_METHOD = "https://schema.org/OnSitePickup";

/**
 * Platform facilitates P2P ads; returns/refunds for items are not processed by ClickAnunț.
 * Links to public terms (not promotion refund page).
 */
export function buildClassifiedMerchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy" as const,
    applicableCountry: "RO",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: absoluteUrl("/terms"),
  };
}

export type ListingProductJsonLdInput = {
  id: string;
  title: string;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
};

/** Product-level fields beyond base listing payload (identifiers only when truthful). */
export function buildListingProductIdentifierFields(
  listing: ListingProductJsonLdInput
): Record<string, unknown> {
  const extra: Record<string, unknown> = {
    "@id": absoluteUrl(`/listings/${listing.id}`),
  };

  if (listing.make && listing.make.trim().length > 0) {
    extra.brand = { "@type": "Brand", name: listing.make.trim() };
  }

  if (listing.model?.trim()) {
    extra.model = listing.model.trim();
  }

  if (isValidListingVin(listing.vin)) {
    extra.vehicleIdentificationNumber = listing.vin!.trim().toUpperCase();
  }

  return extra;
}

/** Offer fields for classified ads (no invented shipping rates or delivery windows). */
export function buildClassifiedOfferPolicyFields(): Record<string, unknown> {
  return {
    availableDeliveryMethod: CLASSIFIED_OFFER_DELIVERY_METHOD,
    hasMerchantReturnPolicy: buildClassifiedMerchantReturnPolicy(),
  };
}
