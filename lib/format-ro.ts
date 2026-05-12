/** Stable integer formatting — avoids SSR/CSR Intl edge cases for simple counts. */
export function formatRoInteger(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
