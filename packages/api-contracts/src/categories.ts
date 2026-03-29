/**
 * GET /api/stats/by-category — DB-backed counts per category string (app/api/stats/by-category/route.ts).
 */
export type CategoryCountsResponseDto = {
  counts: Record<string, number>;
  error?: string;
};

/** GET /api/categories — active listing counts per category, sorted by count desc. */
export type CategoryListItemDto = {
  key: string;
  label: string;
  count: number;
};

export type CategoryListResponseDto = {
  categories: CategoryListItemDto[];
};
