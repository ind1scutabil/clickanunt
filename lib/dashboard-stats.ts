/**
 * Pure helpers for dashboard stats (testable, no side effects).
 */

/** Same result as summing `listing.views` from findMany rows (null → 0). */
export function totalViewsFromAggregate(sum: { views: number | null } | null | undefined): number {
  return sum?.views ?? 0;
}
