/**
 * Allowlisted post-login return paths only (open-redirect safe).
 * Rejects absolute URLs, protocol-relative, encoded tricks, and any path
 * outside the fixed internal publish entry.
 */
const ALLOWED_RETURN_PATHS = new Set<string>(["/listings/new"]);

export function sanitizeAuthReturnPath(
  raw: string | null | undefined,
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
  const pathOnly = decoded.split(/[?#]/, 1)[0] ?? "";
  if (!ALLOWED_RETURN_PATHS.has(pathOnly)) return null;
  return pathOnly;
}
