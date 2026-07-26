/**
 * Validate listing PATCH against effective category/subcategory (existing + payload).
 * Strict attributes allowlist — foreign keys → error (400 at API).
 */
import {
  findIncompatibleAutoTopLevelFields,
  isSubcategoryRequired,
  sanitizeListingAttributes,
  isAutoCategoryLabel,
  AUTO_TOP_LEVEL_FIELDS,
  type AutoTopLevelField,
} from "@/lib/listing-attributes-sanitize";
import { VALID_CATEGORY_LABELS, isValidSubcategory } from "@/lib/taxonomy";

export type ListingTaxonomyContext = {
  category: string | null;
  subcategory: string | null;
  attributes?: unknown;
  make?: unknown;
  model?: unknown;
  vin?: unknown;
  year?: unknown;
  mileage?: unknown;
  fuel?: unknown;
  transmission?: unknown;
};

export type ListingPatchTaxonomyInput = {
  existing: ListingTaxonomyContext;
  patch: Partial<ListingTaxonomyContext> & {
    category?: string | null;
    subcategory?: string | null;
    attributes?: unknown;
  };
};

export type ListingPatchTaxonomyResult =
  | {
      ok: true;
      effectiveCategory: string;
      effectiveSubcategory: string | null;
      /** Attributes to persist when patch includes attributes OR category changed. */
      attributesToPersist?: Record<string, unknown>;
      clearAutoFields: boolean;
    }
  | { ok: false; message: string; path: string };

function trimOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function validateListingPatchTaxonomy(
  input: ListingPatchTaxonomyInput
): ListingPatchTaxonomyResult {
  const { existing, patch } = input;

  const categoryProvided = Object.prototype.hasOwnProperty.call(patch, "category");
  const subcategoryProvided = Object.prototype.hasOwnProperty.call(patch, "subcategory");
  const attributesProvided = Object.prototype.hasOwnProperty.call(patch, "attributes");

  const effectiveCategory =
    (categoryProvided ? trimOrNull(patch.category) : null) ??
    trimOrNull(existing.category) ??
    "";

  if (!effectiveCategory || !VALID_CATEGORY_LABELS.has(effectiveCategory)) {
    return { ok: false, message: "Categorie invalidă", path: "category" };
  }

  const effectiveSubcategory = subcategoryProvided
    ? trimOrNull(patch.subcategory)
    : trimOrNull(existing.subcategory);

  const categoryChanged =
    categoryProvided &&
    trimOrNull(patch.category) !== null &&
    trimOrNull(patch.category) !== trimOrNull(existing.category);

  // Changing category without subcategory: cannot keep old incompatible sub.
  if (categoryChanged && !subcategoryProvided) {
    if (isSubcategoryRequired(effectiveCategory)) {
      return {
        ok: false,
        message: "Subcategoria este obligatorie când schimbi categoria",
        path: "subcategory",
      };
    }
  }

  if (isSubcategoryRequired(effectiveCategory)) {
    if (!effectiveSubcategory) {
      // Only error when create-like completeness is required for this write:
      // - category changed
      // - subcategory explicitly cleared
      // - attributes being written (need sub context for allowlist)
      if (categoryChanged || subcategoryProvided || attributesProvided) {
        return {
          ok: false,
          message: "Subcategoria este obligatorie pentru această categorie",
          path: "subcategory",
        };
      }
    } else if (!isValidSubcategory(effectiveCategory, effectiveSubcategory)) {
      return {
        ok: false,
        message: `Subcategoria "${effectiveSubcategory}" nu este validă pentru categoria "${effectiveCategory}"`,
        path: "subcategory",
      };
    }
  } else if (
    effectiveSubcategory &&
    !isValidSubcategory(effectiveCategory, effectiveSubcategory)
  ) {
    return {
      ok: false,
      message: `Subcategoria "${effectiveSubcategory}" nu este validă pentru categoria "${effectiveCategory}"`,
      path: "subcategory",
    };
  }

  // Auto top-level fields from patch merged with existing for incompatibility check
  // when category is non-auto: any populated auto field in patch is rejected.
  const autoProbe: Partial<Record<AutoTopLevelField, unknown>> = {};
  for (const key of AUTO_TOP_LEVEL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      autoProbe[key] = (patch as Record<string, unknown>)[key];
    }
  }
  const incompatible = findIncompatibleAutoTopLevelFields(effectiveCategory, autoProbe);
  if (incompatible.length > 0) {
    return {
      ok: false,
      message: `Câmpul "${incompatible[0]}" nu este permis pentru categoria "${effectiveCategory}"`,
      path: incompatible[0],
    };
  }

  let attributesToPersist: Record<string, unknown> | undefined;

  if (attributesProvided) {
    const { attributes, strippedKeys } = sanitizeListingAttributes(
      effectiveCategory,
      effectiveSubcategory,
      patch.attributes
    );
    if (strippedKeys.length > 0) {
      return {
        ok: false,
        message: `Atribute incompatibile cu categoria: ${strippedKeys.join(", ")}`,
        path: "attributes",
      };
    }
    attributesToPersist = attributes;
  } else if (categoryChanged) {
    // Do not keep previous category's attribute bag after category change.
    attributesToPersist = {};
  }

  const clearAutoFields =
    categoryChanged && !isAutoCategoryLabel(effectiveCategory);

  return {
    ok: true,
    effectiveCategory,
    effectiveSubcategory,
    attributesToPersist,
    clearAutoFields,
  };
}
