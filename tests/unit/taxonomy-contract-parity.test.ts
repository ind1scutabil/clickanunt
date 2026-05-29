/**
 * Drift guard: the web server taxonomy (lib/taxonomy.ts) and the shared client
 * contract (packages/api-contracts) MUST describe the identical category +
 * subcategory label/slug tree. Mobile derives its picker from the contract, so
 * this test is what keeps web ⇄ Android category parity 1:1.
 */
import { TAXONOMY } from "@/lib/taxonomy";
import { MARKETPLACE_TAXONOMY } from "@/packages/api-contracts/src/taxonomy";

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

describe("taxonomy contract parity (web ⇄ shared/mobile)", () => {
  it("has the same number of top-level categories", () => {
    expect(MARKETPLACE_TAXONOMY.length).toBe(TAXONOMY.length);
  });

  it("category + subcategory label/slug trees are identical", () => {
    expect(flatten(MARKETPLACE_TAXONOMY)).toEqual(flatten(TAXONOMY));
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
