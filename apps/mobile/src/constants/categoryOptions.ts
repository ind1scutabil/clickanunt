/**
 * Category / subcategory labels for the mobile publish/edit form.
 *
 * 1:1 PARITY: derived from the shared canonical taxonomy contract
 * (`@clickanunt/api-contracts` → MARKETPLACE_TAXONOMY), the same tree the web
 * `lib/taxonomy.ts` is verified against. Do NOT hand-edit category data here —
 * change `packages/api-contracts/src/taxonomy.ts` so web + mobile stay in sync.
 */
import { MARKETPLACE_TAXONOMY } from '@clickanunt/api-contracts';

export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(
  MARKETPLACE_TAXONOMY.map((cat) => [cat.label, cat.subcategories.map((sub) => sub.label)]),
);

export const ALL_CATEGORY_LABELS = MARKETPLACE_TAXONOMY.map((cat) => cat.label)
  .slice()
  .sort();

export function subcategoriesForCategory(category: string): string[] {
  return CATEGORY_SUBCATEGORIES[category] ?? [];
}
