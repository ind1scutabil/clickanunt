/**
 * Canonicalize listing photo URLs for Google image sitemaps.
 *
 * Policy (FAZA 21D):
 * - Output host is exclusively the SEO canonical origin (https://www.clickanunt.ro in prod).
 * - Only `/api/uploads/serve` and `/uploads/` paths are allowed.
 * - Loopback absolute URLs with those paths are rewritten onto the canonical origin.
 * - Foreign hosts, spoofed hosts, credentials, forbidden schemes, non-https, and
 *   non-default ports are rejected. No network fetch is performed (no SSRF).
 */

const ALLOWED_PATH_PREFIXES = ["/api/uploads/serve", "/uploads/"] as const;

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0:0:0:0:0:0:0:1";
}

function isAllowedUploadPath(pathname: string): boolean {
  if (pathname === "/api/uploads/serve" || pathname.startsWith("/api/uploads/serve/")) {
    return true;
  }
  if (pathname === "/uploads" || pathname.startsWith("/uploads/")) {
    return true;
  }
  return false;
}

/** Reject path traversal and null bytes in serve keys / upload paths. */
function pathOrKeyIsSafe(pathname: string, search: string): boolean {
  const raw = `${pathname}${search}`;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return false;
  }
  // Double-decode once more for double-encoded traversal
  let decoded2 = decoded;
  try {
    decoded2 = decodeURIComponent(decoded);
  } catch {
    /* keep decoded */
  }
  for (const s of [raw, decoded, decoded2]) {
    if (s.includes("\0")) return false;
    if (/(^|\/|\\|%2f|%5c)\.\.(%2f|%5c|\/|\\|$)/i.test(s)) return false;
    if (s.includes("..")) return false;
  }
  return true;
}

function isDefaultHttpsPort(port: string): boolean {
  return port === "" || port === "443";
}

/**
 * @param photo - raw photo string from listing.photos
 * @param base - canonical SEO origin, e.g. https://www.clickanunt.ro
 * @returns absolute https URL on the canonical host, or null if rejected
 */
export function canonicalizeSitemapImageUrl(photo: string, base: string): string | null {
  if (typeof photo !== "string") return null;
  const trimmed = photo.trim();
  if (!trimmed) return null;

  // Forbidden schemes / obvious non-URL payloads before URL()
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }

  let origin: URL;
  try {
    origin = new URL(base);
  } catch {
    return null;
  }
  if (origin.protocol !== "https:" || !isDefaultHttpsPort(origin.port)) return null;

  let u: URL;
  try {
    if (trimmed.startsWith("//")) {
      // Protocol-relative: resolve against https — then require canonical or reject
      u = new URL(`https:${trimmed}`);
    } else if (trimmed.startsWith("/")) {
      u = new URL(trimmed, origin);
    } else if (!/^https?:\/\//i.test(trimmed)) {
      u = new URL(`/${trimmed.replace(/^\/+/, "")}`, origin);
    } else {
      u = new URL(trimmed);
    }
  } catch {
    return null;
  }

  // Credentials never allowed
  if (u.username || u.password) return null;

  const host = u.hostname.toLowerCase();
  if (!host) return null;

  const canonicalHost = origin.hostname.toLowerCase();
  const isCanonical = host === canonicalHost;
  const loopback = isLoopbackHost(host);

  if (!isCanonical && !loopback) {
    return null;
  }

  // Non-canonical loopback may use http or https; we rewrite onto https origin.
  // Canonical must already be https.
  if (isCanonical) {
    if (u.protocol !== "https:") return null;
    if (!isDefaultHttpsPort(u.port)) return null;
  } else if (loopback) {
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  }

  if (!isAllowedUploadPath(u.pathname)) return null;
  if (!pathOrKeyIsSafe(u.pathname, u.search)) return null;

  // Serve endpoint: only allow `key` query param (optional empty for /uploads/ static)
  if (u.pathname.startsWith("/api/uploads/serve")) {
    const params = u.searchParams;
    const keys = [...params.keys()];
    if (keys.some((k) => k !== "key")) return null;
    const key = params.get("key");
    if (!key || !key.trim()) return null;
    if (!pathOrKeyIsSafe("", key)) return null;
  }

  // Rebuild on canonical origin — strip hash, normalize host/protocol/port
  const out = new URL(`${u.pathname}${u.search}`, origin);
  out.hash = "";
  if (out.protocol !== "https:") return null;
  if (out.hostname.toLowerCase() !== canonicalHost) return null;
  if (!isDefaultHttpsPort(out.port)) return null;
  if (!isAllowedUploadPath(out.pathname)) return null;

  return out.toString();
}
