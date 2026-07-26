/**
 * Canonical create payloads mirroring real clients (web wizard / mobile form).
 * Used by contract tests — keep in sync with OptimizedListingFlow + ListingFormScreen.
 */
import type { ListingCreateBodyDto } from "@/packages/api-contracts/src/listing";

const PHOTO = "/uploads/listings/x/original/a.jpg";

/** Mirrors OptimizedListingFlow non-Auto payload shape. */
export function buildWebCreatePayload(
  overrides: Partial<ListingCreateBodyDto> = {}
): ListingCreateBodyDto {
  return {
    title: "iPhone 14 Pro Max 256GB",
    description: "Descriere suficient de lunga pentru publicare pe web.",
    category: "Electronice și electrocasnice",
    subcategory: "Telefoane mobile",
    priceAmount: 4500,
    priceCurrency: "RON",
    county: "Cluj",
    city: "Cluj-Napoca",
    photos: [PHOTO],
    contactPhone: "0712345678",
    ...overrides,
  };
}

/** Mirrors apps/mobile ListingFormScreen create payload. */
export function buildMobileCreatePayload(
  overrides: Partial<ListingCreateBodyDto> = {}
): ListingCreateBodyDto {
  return {
    title: "Anunt mobil valid test",
    description: "Descriere din aplicatia mobila Expo.",
    category: "Altele",
    subcategory: "Diverse",
    priceAmount: 100,
    priceCurrency: "RON",
    county: "București",
    city: "Sectorul 1",
    photos: [PHOTO],
    make: undefined,
    model: undefined,
    ...overrides,
  };
}

/** Auto payload with valid make/model pair. */
export function buildWebAutoCreatePayload(
  overrides: Partial<ListingCreateBodyDto> = {}
): ListingCreateBodyDto {
  return {
    title: "Peugeot 508 1.6 BlueHDi 2017",
    description: "Masina in stare buna, istoric service.",
    category: "Auto, moto și ambarcațiuni",
    subcategory: "Autoturisme",
    priceAmount: 12500,
    priceCurrency: "EUR",
    county: "București",
    city: "Sectorul 1",
    photos: [PHOTO],
    make: "Peugeot",
    model: "508",
    year: 2017,
    fuel: "diesel",
    transmission: "manual",
    ...overrides,
  };
}

/** Jobs payload — priceAmount still required (>0) until salary migration. */
export function buildJobsCreatePayload(
  overrides: Partial<ListingCreateBodyDto> = {}
): ListingCreateBodyDto {
  return {
    title: "Developer React mid-level Cluj",
    description: "Cautam developer React cu experienta pe Next.js.",
    category: "Locuri de muncă",
    subcategory: "IT/Software",
    priceAmount: 8000,
    priceCurrency: "RON",
    county: "Cluj",
    city: "Cluj-Napoca",
    photos: [PHOTO],
    attributes: {
      contract_type: "Full-time",
      salary_range: "7000-9000 RON net",
      work_mode: "Hibrid",
    },
    ...overrides,
  };
}
