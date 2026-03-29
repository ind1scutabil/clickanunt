/**
 * Probabilistic sampling for high-volume events (listing_view) to reduce write load.
 * ANALYTICS_LISTING_VIEW_SAMPLE_RATE: 0–1 (default 1 = record all).
 */

export function shouldRecordListingView(): boolean {
  const raw = process.env.ANALYTICS_LISTING_VIEW_SAMPLE_RATE ?? "1";
  const rate = parseFloat(raw);
  if (Number.isNaN(rate)) return true;
  const clamped = Math.min(1, Math.max(0, rate));
  if (clamped >= 1) return true;
  if (clamped <= 0) return false;
  return Math.random() < clamped;
}
