/**
 * Maps Auto draft fields onto POST /api/listings payload (top-level + attributes).
 */

import { normalizeCountryOfOriginValue } from "@/lib/listing-country-options";

export type AutoListingDraftFields = {
  vin?: string;
  accidents?: string;
  rare?: boolean;
  horsepower?: number | "";
  cylinderCapacity?: number | "";
  bodyType?: string;
  color?: string;
  seatCount?: number | "";
  doorCount?: number | "";
  owners?: number | "";
  keys?: number | "";
  registrationDate?: string;
  inspectionExpires?: string;
  countryOfOrigin?: string;
  lastRegistrationCountry?: string;
  environmentalClass?: string;
  co2Emissions?: number | "";
  upholstery?: string;
  cocPapers?: boolean;
};

function numOrNull(v: number | "" | undefined): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Appends auto-specific listing fields expected by listingCreateSchema + API attributes merge.
 */
export function appendAutoFieldsToListingPayload(
  payload: Record<string, unknown>,
  draft: AutoListingDraftFields
): void {
  payload.vin = draft.vin?.trim() || null;
  payload.accidents = draft.accidents?.trim() || null;
  payload.rare = Boolean(draft.rare);
  payload.horsepower = numOrNull(draft.horsepower);
  payload.cylinderCapacity = numOrNull(draft.cylinderCapacity);
  payload.bodyType = draft.bodyType?.trim() || null;
  payload.color = draft.color?.trim() || null;
  payload.seatCount = numOrNull(draft.seatCount);
  payload.doorCount = numOrNull(draft.doorCount);
  payload.owners = numOrNull(draft.owners);
  payload.keys = numOrNull(draft.keys);
  payload.registrationDate = draft.registrationDate?.trim() || null;
  payload.inspectionExpires = draft.inspectionExpires?.trim() || null;
  payload.countryOfOrigin =
    normalizeCountryOfOriginValue(draft.countryOfOrigin) || null;
  payload.environmentalClass = draft.environmentalClass?.trim() || null;
  payload.co2Emissions = numOrNull(draft.co2Emissions);
  payload.upholstery = draft.upholstery?.trim() || null;
  payload.cocPapers = Boolean(draft.cocPapers);

  const attrs: Record<string, unknown> = {
    ...((payload.attributes as Record<string, unknown>) ?? {}),
  };
  const lastReg = normalizeCountryOfOriginValue(draft.lastRegistrationCountry);
  if (lastReg) {
    attrs.lastRegistrationCountry = lastReg;
  }
  if (Object.keys(attrs).length > 0) {
    payload.attributes = attrs;
  }
}
