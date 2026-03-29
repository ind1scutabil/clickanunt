/**
 * Logică pură pentru suma finală la checkout promovare (partajată client/server).
 * Fără Prisma — sigură pentru import din componente client.
 */

export function applyUserPromotionDiscountToBaseBani(
  baseBani: number,
  promotionDiscountPercent: number | null | undefined
): number {
  const pct = promotionDiscountPercent ?? 0;
  if (pct <= 0) return baseBani;
  const discountApplied = Math.floor((baseBani * pct) / 100);
  let finalAmount = baseBani - discountApplied;
  if (finalAmount < 200) finalAmount = 200;
  return finalAmount;
}
