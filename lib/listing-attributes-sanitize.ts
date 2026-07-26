/**
 * Sanitize / validate listing.attributes against taxonomy AttributeFieldDef keys.
 * Strip incompatible Auto top-level fields for non-Auto categories (no migration).
 */
import { getAttributeDefsFor, getCategoryDef } from "@/lib/taxonomy";

/** Prisma / create-body columns that are Auto-specific. */
export const AUTO_TOP_LEVEL_FIELDS = [
  "make",
  "model",
  "vin",
  "year",
  "mileage",
  "fuel",
  "transmission",
] as const;

export type AutoTopLevelField = (typeof AUTO_TOP_LEVEL_FIELDS)[number];

/** Extra keys historically merged into attributes JSON for Auto listings. */
export const AUTO_ATTRIBUTE_BAG_KEYS = [
  "accidents",
  "rare",
  "horsepower",
  "cylinderCapacity",
  "bodyType",
  "color",
  "seatCount",
  "doorCount",
  "owners",
  "keys",
  "registrationDate",
  "inspectionExpires",
  "countryOfOrigin",
  "environmentalClass",
  "co2Emissions",
  "upholstery",
  "cocPapers",
] as const;

export function isAutoCategoryLabel(categoryLabel: string): boolean {
  return getCategoryDef(categoryLabel)?.slug === "auto";
}

export function allowedAttributeKeysFor(
  categoryLabel: string,
  subcategoryLabel?: string | null
): Set<string> {
  return new Set(
    getAttributeDefsFor(categoryLabel, subcategoryLabel).map((d) => d.key)
  );
}

/**
 * Keep only keys allowed for the category/subcategory.
 * Returns { attributes, strippedKeys }.
 */
export function sanitizeListingAttributes(
  categoryLabel: string,
  subcategoryLabel: string | null | undefined,
  attributes: unknown
): { attributes: Record<string, unknown>; strippedKeys: string[] } {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return { attributes: {}, strippedKeys: [] };
  }
  const allowed = allowedAttributeKeysFor(categoryLabel, subcategoryLabel);
  const input = attributes as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const strippedKeys: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (!allowed.has(key)) {
      strippedKeys.push(key);
      continue;
    }
    out[key] = value;
  }
  return { attributes: out, strippedKeys };
}

function isPopulated(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && !Number.isFinite(value)) return false;
  return true;
}

/**
 * For non-Auto categories, populated Auto top-level fields are incompatible.
 * Policy: reject on create/update (caller adds Zod issues) — do not persist silently.
 */
export function findIncompatibleAutoTopLevelFields(
  categoryLabel: string,
  data: Partial<Record<AutoTopLevelField, unknown>>
): AutoTopLevelField[] {
  if (isAutoCategoryLabel(categoryLabel)) return [];
  return AUTO_TOP_LEVEL_FIELDS.filter((key) => isPopulated(data[key]));
}

/** Null out Auto columns when persisting a non-Auto listing. */
export function nullAutoTopLevelForNonAuto<T extends Record<string, unknown>>(
  categoryLabel: string,
  data: T
): T {
  if (isAutoCategoryLabel(categoryLabel)) return data;
  const next = { ...data };
  for (const key of AUTO_TOP_LEVEL_FIELDS) {
    (next as Record<string, unknown>)[key] = null;
  }
  return next;
}

/**
 * Build attributes object for Prisma create: taxonomy attrs only (+ Auto bag when Auto).
 */
export function buildPersistedAttributes(params: {
  categoryLabel: string;
  subcategoryLabel?: string | null;
  attributes?: unknown;
  autoBagFields?: Record<string, unknown>;
}): { attributes: Record<string, unknown>; strippedKeys: string[] } {
  const { attributes, strippedKeys } = sanitizeListingAttributes(
    params.categoryLabel,
    params.subcategoryLabel,
    params.attributes
  );

  if (!isAutoCategoryLabel(params.categoryLabel)) {
    return { attributes, strippedKeys };
  }

  const bag = params.autoBagFields ?? {};
  const merged: Record<string, unknown> = { ...attributes };
  for (const key of AUTO_ATTRIBUTE_BAG_KEYS) {
    if (key in bag && bag[key] !== undefined) {
      merged[key] = bag[key];
    }
  }
  return { attributes: merged, strippedKeys };
}

export function categoryHasSubcategories(categoryLabel: string): boolean {
  const def = getCategoryDef(categoryLabel);
  return Boolean(def && def.subcategories.length > 0);
}

export function isSubcategoryRequired(categoryLabel: string): boolean {
  return categoryHasSubcategories(categoryLabel);
}

/** Empty draft slice when switching category — clears Auto + attributes. */
export function emptyFieldsAfterCategoryChange(): {
  subcategory: string;
  attributes: Record<string, unknown>;
  make: string;
  model: string;
  year: number | "";
  mileage: number | "";
  fuel: string;
  transmission: string;
  vin: string;
} {
  return {
    subcategory: "",
    attributes: {},
    make: "",
    model: "",
    year: "",
    mileage: "",
    fuel: "",
    transmission: "",
    vin: "",
  };
}
