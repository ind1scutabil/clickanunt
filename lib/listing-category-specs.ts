/**
 * Listing detail specification rows — shared rules for web listing page.
 * Only emits rows with real values (no empty "—" placeholders).
 */

import { formatCountryOfOriginDisplay } from '@/lib/listing-country-options';

export const AUTO_CATEGORY = 'Auto, moto și ambarcațiuni';

export type ListingSpecRow = {
  label: string;
  value: string;
};

export type ListingSpecSource = {
  category?: string | null;
  subcategory?: string | null;
  county?: string | null;
  city?: string | null;
  condition?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  vin?: string | null;
  attributes?: Record<string, unknown> | null;
};

export function isAutoCategory(category: string | null | undefined): boolean {
  return category === AUTO_CATEGORY;
}

export function isRealEstateCategory(category: string | null | undefined): boolean {
  return String(category ?? '').trim() === 'Imobiliare';
}

export function isHomeGardenCategory(category: string | null | undefined): boolean {
  const c = String(category ?? '').trim();
  return c === 'Casă și grădină' || c.toLowerCase().includes('mobilier');
}

export function isElectronicsCategory(category: string | null | undefined): boolean {
  const c = String(category ?? '').toLowerCase();
  return c.includes('electronice') || c.includes('electrocasnic');
}

const AUTO_ONLY_ATTRIBUTE_KEYS = new Set([
  'keys',
  'rare',
  'cocPapers',
  'accidents',
  'doorCount',
  'seatCount',
  'horsepower',
  'co2Emissions',
  'cylinderCapacity',
  'registrationDate',
  'inspectionExpires',
  'bodyType',
  'body_type',
  'firstRegistration',
  'first_registration',
  'horsePower',
  'horse_power',
  'hp',
  'engineCapacity',
  'engine_capacity',
  'capacity',
  'drivetrain',
  'drive_train',
  'priorDamage',
  'prior_damage',
  'accident',
  'serviceHistory',
  'service_history',
  'countryOfOrigin',
  'country_of_origin',
  'lastRegistrationCountry',
  'last_registration_country',
  'environmentalClass',
  'environmental_class',
  'emission_standard',
  'inspectionValid',
  'inspection_valid',
  'itp',
  'avgFuelLPer100km',
  'consumption',
  'yearlyTaxRon',
  'impozitAnualRon',
]);

const REAL_ESTATE_ATTRIBUTE_FIELDS: Array<{ label: string; keys: string[] }> = [
  { label: 'Suprafață', keys: ['surfaceArea', 'surface', 'suprafata', 'suprafață', 'area', 'mp', 'squareMeters', 'livingArea'] },
  { label: 'Camere', keys: ['rooms', 'camere', 'numberOfRooms', 'bedrooms', 'roomsCount'] },
  { label: 'Etaj', keys: ['floor', 'etaj', 'nivel', 'level'] },
  { label: 'Băi', keys: ['bathrooms', 'bai', 'baths'] },
  { label: 'Tip imobil', keys: ['propertyType', 'tipImobil', 'tip_imobil'] },
  { label: 'Mobilat', keys: ['furnished', 'mobilat', 'furnishing'] },
  { label: 'Parcare', keys: ['parking', 'parcare', 'garage'] },
  { label: 'An construcție', keys: ['yearBuilt', 'constructionYear', 'anConstructie'] },
];

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }
  if (typeof value === 'boolean') {
    return true;
  }
  return String(value).trim().length > 0;
}

function formatScalar(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString('ro-RO');
  }
  if (typeof value === 'boolean') {
    return value ? 'Da' : 'Nu';
  }
  return String(value).trim();
}

export function formatConditionDisplay(condition: string): string {
  const map: Record<string, string> = {
    new: 'Nou',
    used: 'Folosit',
    refurbished: 'Recondiționat',
    for_parts: 'Pentru piese',
    Nou: 'Nou',
    Folosit: 'Folosit',
    Recondiționat: 'Recondiționat',
    'Pentru piese': 'Pentru piese',
  };
  return map[condition] ?? condition;
}

export function formatFuelDisplay(fuel: string): string {
  const key = fuel.trim().toLowerCase();
  const map: Record<string, string> = {
    petrol: 'Benzină',
    diesel: 'Motorină',
    electric: 'Electric',
    hybrid: 'Hybrid',
    lpg: 'GPL',
    gas: 'GPL',
  };
  return map[key] ?? fuel;
}

export function formatTransmissionDisplay(transmission: string): string {
  const key = transmission.trim().toLowerCase();
  const map: Record<string, string> = {
    manual: 'Manuală',
    automatic: 'Automată',
  };
  return map[key] ?? transmission;
}

function attrsRecord(listing: ListingSpecSource): Record<string, unknown> {
  if (!listing.attributes || typeof listing.attributes !== 'object' || Array.isArray(listing.attributes)) {
    return {};
  }
  return listing.attributes;
}

function attrFirst(attrs: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = attrs[key];
    if (hasValue(value)) {
      return formatScalar(value);
    }
  }
  return null;
}

function pushRow(rows: ListingSpecRow[], label: string, value: unknown): void {
  if (!hasValue(value)) {
    return;
  }
  rows.push({ label, value: formatScalar(value) });
}

function pushAttrRow(rows: ListingSpecRow[], label: string, keys: string[], attrs: Record<string, unknown>): void {
  const value = attrFirst(attrs, keys);
  if (value) {
    rows.push({ label, value });
  }
}

function humanizeAttributeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SKIP_FALSE_FLAG_KEYS = new Set(['rare', 'cocPapers']);

function appendGenericAttributes(
  rows: ListingSpecRow[],
  attrs: Record<string, unknown>,
  usedKeys: Set<string>,
  excludeAutoKeys: boolean
): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (usedKeys.has(key) || !hasValue(value)) {
      continue;
    }
    if (excludeAutoKeys && AUTO_ONLY_ATTRIBUTE_KEYS.has(key)) {
      continue;
    }
    if (SKIP_FALSE_FLAG_KEYS.has(key) && value === false) {
      continue;
    }
    rows.push({ label: humanizeAttributeKey(key), value: formatScalar(value) });
    usedKeys.add(key);
  }
}

function appendAutoSpecs(rows: ListingSpecRow[], listing: ListingSpecSource, attrs: Record<string, unknown>): void {
  pushRow(rows, 'Marcă', listing.make);
  pushRow(rows, 'Model', listing.model);
  pushAttrRow(rows, 'Caroserie', ['bodyType', 'body_type'], attrs);
  if (listing.condition) {
    rows.push({ label: 'Stare', value: formatConditionDisplay(String(listing.condition)) });
  }
  pushRow(rows, 'An fabricație', listing.year);
  pushAttrRow(rows, 'Prima înmatriculare', ['firstRegistration', 'first_registration'], attrs);
  if (listing.mileage != null) {
    rows.push({ label: 'Kilometraj', value: `${formatScalar(listing.mileage)} km` });
  }
  pushRow(rows, 'VIN', listing.vin);
  if (listing.fuel) {
    rows.push({ label: 'Combustibil', value: formatFuelDisplay(String(listing.fuel)) });
  }
  pushAttrRow(rows, 'Putere', ['horsePower', 'horse_power', 'hp'], attrs);
  pushAttrRow(rows, 'Capacitate cilindrică', ['engineCapacity', 'engine_capacity', 'capacity'], attrs);
  if (listing.transmission) {
    rows.push({ label: 'Transmisie', value: formatTransmissionDisplay(String(listing.transmission)) });
  }
  pushAttrRow(rows, 'Tracțiune', ['drivetrain', 'drive_train'], attrs);
  pushAttrRow(rows, 'Culoare', ['color'], attrs);
  pushAttrRow(rows, 'Tapițerie', ['upholstery', 'interior'], attrs);
  pushAttrRow(rows, 'Uși', ['doors', 'door_count'], attrs);
  pushAttrRow(rows, 'Locuri', ['seats', 'seat_count'], attrs);
  pushAttrRow(rows, 'Număr proprietari', ['owners', 'owner_count', 'numberOfOwners'], attrs);
  pushAttrRow(rows, 'Chei', ['keys', 'key_count'], attrs);
  pushAttrRow(rows, 'Istoric service', ['serviceHistory', 'service_history'], attrs);
  pushAttrRow(rows, 'Normă poluare', ['environmentalClass', 'environmental_class', 'emission_standard'], attrs);
  pushAttrRow(rows, 'ITP valabil până', ['inspectionValid', 'inspection_valid', 'itp', 'inspectionExpires'], attrs);
  pushAttrRow(rows, 'Garanție', ['warranty', 'garantie'], attrs);
  const countryRaw = attrFirst(attrs, ['countryOfOrigin', 'country_of_origin']);
  if (countryRaw) {
    rows.push({
      label: 'Țara de proveniență',
      value: formatCountryOfOriginDisplay(countryRaw),
    });
  }
  const lastRegRaw = attrFirst(attrs, [
    'lastRegistrationCountry',
    'last_registration_country',
  ]);
  if (lastRegRaw) {
    rows.push({
      label: 'Ultima țară de înmatriculare',
      value: formatCountryOfOriginDisplay(lastRegRaw),
    });
  }

  const usedKeys = new Set<string>();
  for (const field of REAL_ESTATE_ATTRIBUTE_FIELDS) {
    for (const k of field.keys) {
      usedKeys.add(k);
    }
  }
  appendGenericAttributes(rows, attrs, usedKeys, false);
}

function appendLocationSpecs(rows: ListingSpecRow[], listing: ListingSpecSource): void {
  pushRow(rows, 'Județ', listing.county);
  pushRow(rows, 'Oraș', listing.city);
}

function appendCommonNonAuto(rows: ListingSpecRow[], listing: ListingSpecSource): void {
  pushRow(rows, 'Subcategorie', listing.subcategory);
  if (listing.condition) {
    rows.push({ label: 'Stare', value: formatConditionDisplay(String(listing.condition)) });
  }
}

export function buildListingSpecRows(listing: ListingSpecSource): ListingSpecRow[] {
  const rows: ListingSpecRow[] = [];
  const attrs = attrsRecord(listing);
  const category = listing.category;
  const usedAttrKeys = new Set<string>();

  if (isAutoCategory(category)) {
    appendLocationSpecs(rows, listing);
    appendAutoSpecs(rows, listing, attrs);
    return rows;
  }

  appendLocationSpecs(rows, listing);

  if (isRealEstateCategory(category)) {
    appendCommonNonAuto(rows, listing);
    for (const field of REAL_ESTATE_ATTRIBUTE_FIELDS) {
      pushAttrRow(rows, field.label, field.keys, attrs);
      field.keys.forEach((k) => usedAttrKeys.add(k));
    }
    appendGenericAttributes(rows, attrs, usedAttrKeys, true);
    return rows;
  }

  if (isHomeGardenCategory(category)) {
    appendCommonNonAuto(rows, listing);
    pushAttrRow(rows, 'Livrare', ['delivery', 'livrare', 'shipping'], attrs);
    pushAttrRow(rows, 'Ridicare', ['pickup', 'ridicare'], attrs);
    appendGenericAttributes(rows, attrs, usedAttrKeys, true);
    return rows;
  }

  if (isElectronicsCategory(category)) {
    appendCommonNonAuto(rows, listing);
    pushAttrRow(rows, 'Brand', ['brand', 'marca'], attrs);
    pushAttrRow(rows, 'Model', ['model', 'deviceModel'], attrs);
    if (!attrFirst(attrs, ['model', 'deviceModel']) && listing.model) {
      pushRow(rows, 'Model', listing.model);
    }
    appendGenericAttributes(rows, attrs, usedAttrKeys, true);
    return rows;
  }

  appendCommonNonAuto(rows, listing);
  appendGenericAttributes(rows, attrs, usedAttrKeys, true);
  return rows;
}
