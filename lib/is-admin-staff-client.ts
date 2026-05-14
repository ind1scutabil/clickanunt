/**
 * Client-only helper: roles that may use admin web tooling in the Next app
 * (navbar, bottom bar). Must stay aligned with `useAdminAuth` (admin + owner).
 */
export function isAdminStaffRole(role: unknown): boolean {
  const r = String(role ?? "")
    .trim()
    .toLowerCase();
  return r === "admin" || r === "owner";
}
