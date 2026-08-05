/**
 * Allowlisted post-login return paths only (open-redirect safe).
 * Rejects absolute URLs, protocol-relative, encoded tricks, and path traversal.
 */
const ALLOWED_EXACT = new Set<string>([
  "/favorites",
  "/messages",
  "/dashboard",
  "/listings/new",
  "/admin",
  "/admin/dashboard",
  "/admin/moderation",
  "/admin/promotions",
  "/admin/invoices",
  "/admin/messaging",
]);

function isAllowedReturnPath(pathOnly: string): boolean {
  if (ALLOWED_EXACT.has(pathOnly)) return true;
  if (pathOnly.startsWith("/dashboard/")) return true;
  if (pathOnly.startsWith("/admin/")) return true;
  // Listing thread: /listings/<id>/messages
  if (/^\/listings\/[^/]+\/messages$/.test(pathOnly)) return true;
  return false;
}

export function sanitizeAuthReturnPath(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return null;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return null;
  if (decoded.includes("..")) return null;
  const pathOnly = decoded.split(/[?#]/, 1)[0] ?? "";
  if (!pathOnly || pathOnly.includes("//")) return null;
  if (!isAllowedReturnPath(pathOnly)) return null;
  return pathOnly;
}
