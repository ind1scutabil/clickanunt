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

export type ListingLocationInput = {
  city?: string | null;
  county?: string | null;
};

/**
 * Factual `Place` (city/county in Romania) for `Offer.availableAtOrFrom`.
 * Returns undefined when neither field is present — never fabricates a location.
 */
export function buildListingLocationPlace(
  loc: ListingLocationInput
): { "@type": "Place"; address: Record<string, unknown> } | undefined {
  const city = loc.city?.trim() || undefined;
  const county = loc.county?.trim() || undefined;
  if (!city && !county) return undefined;

  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressCountry: "RO",
  };
  if (city) address.addressLocality = city;
  if (county) address.addressRegion = county;

  return { "@type": "Place", address };
}

/** Prisma FuelType enum → human-readable schema.org `fuelType` text (site language: RO). */
const FUEL_TYPE_LABEL: Record<string, string> = {
  petrol: "Benzină",
  diesel: "Motorină",
  electric: "Electric",
  hybrid: "Hibrid",
};

/** Prisma Transmission enum → schema.org `vehicleTransmission` text (RO). */
const TRANSMISSION_LABEL: Record<string, string> = {
  manual: "Manuală",
  automatic: "Automată",
  semiautomatic: "Semiautomată",
};

export type ListingVehicleInput = {
  year?: number | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
};

/**
 * schema.org Vehicle/Car fields, emitted only for auto-category listings and only
 * when the underlying DB value is factual. `other`/unknown enum values are skipped
 * rather than guessed. Use together with `@type: ["Product", "Car"]`.
 */
export function buildVehicleProductFields(
  vehicle: ListingVehicleInput
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const currentYear = new Date().getFullYear();
  if (
    typeof vehicle.year === "number" &&
    Number.isInteger(vehicle.year) &&
    vehicle.year >= 1900 &&
    vehicle.year <= currentYear + 1
  ) {
    out.vehicleModelDate = String(vehicle.year);
  }

  if (
    typeof vehicle.mileage === "number" &&
    Number.isFinite(vehicle.mileage) &&
    vehicle.mileage >= 0 &&
    vehicle.mileage < 10_000_000
  ) {
    out.mileageFromOdometer = {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "KMT",
    };
  }

  if (vehicle.fuel) {
    const fuelLabel = FUEL_TYPE_LABEL[vehicle.fuel];
    if (fuelLabel) out.fuelType = fuelLabel;
  }

  if (vehicle.transmission) {
    const transLabel = TRANSMISSION_LABEL[vehicle.transmission];
    if (transLabel) out.vehicleTransmission = transLabel;
  }

  return out;
}
