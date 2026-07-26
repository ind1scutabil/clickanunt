/**
 * Single listing price formatter for UI cards.
 * Uses ro-RO number grouping + explicit currency code (never Intl currency style,
 * which already embeds the code and causes "EUR EUR" when appended again).
 */
export function formatListingPrice(
  amount: number,
  currency: string | null | undefined,
): string {
  if (!Number.isFinite(amount) || amount === 0) return "Negociabil";
  const code = (currency || "RON").trim().toUpperCase() || "RON";
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${code}`;
}
