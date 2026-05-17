/**
 * Shared country-of-origin options for Auto listings (create + edit + display).
 * Values: ISO 3166-1 alpha-2 where applicable, or OTHER.
 */

export type ListingCountryOption = {
  value: string;
  label: string;
};

/** România first, then alphabetical by Romanian label, Altă țară last. */
const COUNTRY_ENTRIES: ListingCountryOption[] = [
  { value: "RO", label: "România" },
  { value: "AL", label: "Albania" },
  { value: "SA", label: "Arabia Saudită" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgia" },
  { value: "BA", label: "Bosnia și Herțegovina" },
  { value: "BG", label: "Bulgaria" },
  { value: "CA", label: "Canada" },
  { value: "CY", label: "Cipru" },
  { value: "CN", label: "China" },
  { value: "KR", label: "Coreea de Sud" },
  { value: "HR", label: "Croația" },
  { value: "DK", label: "Danemarca" },
  { value: "AE", label: "Emiratele Arabe Unite" },
  { value: "EE", label: "Estonia" },
  { value: "FI", label: "Finlanda" },
  { value: "FR", label: "Franța" },
  { value: "DE", label: "Germania" },
  { value: "GR", label: "Grecia" },
  { value: "IS", label: "Islanda" },
  { value: "IE", label: "Irlanda" },
  { value: "IT", label: "Italia" },
  { value: "JP", label: "Japonia" },
  { value: "LV", label: "Letonia" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LT", label: "Lituania" },
  { value: "LU", label: "Luxemburg" },
  { value: "MK", label: "Macedonia de Nord" },
  { value: "MT", label: "Malta" },
  { value: "GB", label: "Regatul Unit" },
  { value: "MD", label: "Republica Moldova" },
  { value: "NO", label: "Norvegia" },
  { value: "NL", label: "Olanda" },
  { value: "PL", label: "Polonia" },
  { value: "PT", label: "Portugalia" },
  { value: "QA", label: "Qatar" },
  { value: "CZ", label: "Cehia" },
  { value: "ME", label: "Muntenegru" },
  { value: "RS", label: "Serbia" },
  { value: "SK", label: "Slovacia" },
  { value: "SI", label: "Slovenia" },
  { value: "ES", label: "Spania" },
  { value: "US", label: "Statele Unite ale Americii" },
  { value: "SE", label: "Suedia" },
  { value: "CH", label: "Elveția" },
  { value: "TR", label: "Turcia" },
  { value: "UA", label: "Ucraina" },
  { value: "HU", label: "Ungaria" },
  { value: "OTHER", label: "Altă țară" },
];

export const LISTING_COUNTRY_OF_ORIGIN_OPTIONS: readonly ListingCountryOption[] =
  COUNTRY_ENTRIES;

const BY_VALUE = new Map(COUNTRY_ENTRIES.map((o) => [o.value, o.label]));
const BY_LABEL_LOWER = new Map(
  COUNTRY_ENTRIES.map((o) => [o.label.toLowerCase(), o.value])
);

/** Legacy free-text / variant labels from older forms. */
const LEGACY_LABEL_ALIASES: Record<string, string> = {
  romania: "RO",
  românia: "RO",
  germania: "DE",
  franta: "FR",
  franța: "FR",
  italia: "IT",
  spania: "ES",
  "regatul unit": "GB",
  "marea britanie": "GB",
  uk: "GB",
  sua: "US",
  "statele unite": "US",
  "statele unite ale americii": "US",
  elvetia: "CH",
  elveția: "CH",
  "alta tara": "OTHER",
  "altă țară": "OTHER",
  other: "OTHER",
};

/**
 * Normalize stored/raw value to a canonical option value (ISO/OTHER), or "" if empty.
 */
export function normalizeCountryOfOriginValue(
  raw: string | null | undefined
): string {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (BY_VALUE.has(upper)) return upper;

  const lower = trimmed.toLowerCase();
  if (LEGACY_LABEL_ALIASES[lower]) return LEGACY_LABEL_ALIASES[lower];
  if (BY_LABEL_LOWER.has(lower)) return BY_LABEL_LOWER.get(lower)!;

  return trimmed;
}

/**
 * Romanian display label for listing detail / specs.
 */
export function formatCountryOfOriginDisplay(
  raw: string | null | undefined
): string {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  const normalized = normalizeCountryOfOriginValue(trimmed);
  if (normalized && BY_VALUE.has(normalized)) {
    return BY_VALUE.get(normalized)!;
  }
  if (BY_VALUE.has(trimmed.toUpperCase())) {
    return BY_VALUE.get(trimmed.toUpperCase())!;
  }
  const byLabel = BY_LABEL_LOWER.get(trimmed.toLowerCase());
  if (byLabel) return BY_VALUE.get(byLabel)!;

  return trimmed;
}

export function isKnownCountryOfOriginValue(value: string): boolean {
  const n = normalizeCountryOfOriginValue(value);
  return n !== "" && BY_VALUE.has(n);
}
