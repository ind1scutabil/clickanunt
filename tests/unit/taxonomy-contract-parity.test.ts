/**
 * Drift guard: web TAXONOMY vs shared MARKETPLACE_TAXONOMY (labels/slugs + UI attributes).
 */
import { TAXONOMY, getAttributeDefsFor } from "@/lib/taxonomy";
import {
  MARKETPLACE_TAXONOMY,
  getContractAttributeDefsFor,
} from "@/packages/api-contracts/src/taxonomy";

type Flat = { label: string; slug: string; subcategories: { label: string; slug: string }[] };

const flatten = (
  cats: ReadonlyArray<{
    label: string;
    slug: string;
    subcategories: ReadonlyArray<{ label: string; slug: string }>;
  }>,
): Flat[] =>
  cats.map((c) => ({
    label: c.label,
    slug: c.slug,
    subcategories: c.subcategories.map((s) => ({ label: s.label, slug: s.slug })),
  }));

function slimDefs(
  defs: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[] | readonly string[];
    required?: boolean;
  }>
) {
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    options: d.options ? [...d.options] : undefined,
    required: d.required || false,
  }));
}

describe("taxonomy contract parity (web ⇄ shared/mobile)", () => {
  it("has the same number of top-level categories", () => {
    expect(MARKETPLACE_TAXONOMY.length).toBe(TAXONOMY.length);
  });

  it("category + subcategory label/slug trees are identical", () => {
    expect(flatten(MARKETPLACE_TAXONOMY)).toEqual(flatten(TAXONOMY));
  });

  it("attribute defs match for every category/subcategory pair", () => {
    for (const cat of TAXONOMY) {
      expect(slimDefs(getAttributeDefsFor(cat.label, null))).toEqual(
        slimDefs(getContractAttributeDefsFor(cat.label, null))
      );
      for (const sub of cat.subcategories) {
        expect(slimDefs(getAttributeDefsFor(cat.label, sub.label))).toEqual(
          slimDefs(getContractAttributeDefsFor(cat.label, sub.label))
        );
      }
    }
  });

  it("category slugs are unique in the contract", () => {
    const slugs = MARKETPLACE_TAXONOMY.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("subcategory slugs are unique within each category", () => {
    for (const cat of MARKETPLACE_TAXONOMY) {
      const slugs = cat.subcategories.map((s) => s.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
