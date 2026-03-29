/**
 * Stare suspendare moderare (temporară, distinctă de ban).
 */
export function isModerationSuspensionActive(
  until: Date | string | null | undefined
): boolean {
  if (until == null) return false;
  const d = typeof until === 'string' ? new Date(until) : until;
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}
