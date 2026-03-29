/**
 * Scor denormalizat pentru feed-ul public: paginare keyset stabilă la milioane de rânduri.
 * (isPromoted / isFeatured nu pot fi folosite singure în cursor fără câmp numeric comparabil.)
 */
export function computeFeedBoost(isPromoted: boolean, isFeatured: boolean): number {
  if (isPromoted) return 1000;
  if (isFeatured) return 100;
  return 0;
}
