/**
 * `/auto/*` is owned by make/city hubs (`app/auto/[makeSlug]`). Taxonomy
 * subcategory paths such as `/auto/autoturisme` are not routed there and
 * must not appear in the category sitemap (they 404 today).
 */
export function shouldEmitCategorySubcategorySitemapPath(mapped: {
  categorySlug: string;
}): boolean {
  return mapped.categorySlug !== "auto";
}
