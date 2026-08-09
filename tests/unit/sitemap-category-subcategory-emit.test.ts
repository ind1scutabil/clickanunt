import { shouldEmitCategorySubcategorySitemapPath } from "@/lib/seo/category-sitemap-policy";

describe("category sitemap subcategory emission", () => {
  it("does not emit Auto taxonomy subcategory paths under /auto/*", () => {
    expect(shouldEmitCategorySubcategorySitemapPath({ categorySlug: "auto" })).toBe(false);
  });

  it("still emits non-Auto subcategory paths", () => {
    expect(shouldEmitCategorySubcategorySitemapPath({ categorySlug: "electronice" })).toBe(true);
    expect(shouldEmitCategorySubcategorySitemapPath({ categorySlug: "moda" })).toBe(true);
    expect(shouldEmitCategorySubcategorySitemapPath({ categorySlug: "imobiliare" })).toBe(true);
  });
});
