import type { NextRequest } from "next/server";

/**
 * Use `.clickanunt.ro` only when the browser host is that site. Setting it on
 * localhost / 127.0.0.1 breaks CSRF and auth cookies (browser ignores wrong domain).
 */
export function cookieDomainFromRequest(request: NextRequest): string | undefined {
  const host = request.headers.get("host");
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return undefined;
  }
  if (hostname === "clickanunt.ro" || hostname.endsWith(".clickanunt.ro")) {
    return ".clickanunt.ro";
  }
  return undefined;
}

/** HTTPS-only cookies in real prod; allow http://localhost with NODE_ENV=production (smoke tests). */
export function cookieSecureFromRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
    return false;
  }
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  if (proto === "http") return false;
  return true;
}
