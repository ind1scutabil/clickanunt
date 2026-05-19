/**
 * Apex → www canonicalization (SEO). Used by proxy.ts — unit-tested in isolation.
 */

import { siteOrigin } from "@/lib/site-url";

const APEX_HOSTS = new Set(["clickanunt.ro"]);

export function shouldRedirectApexToWww(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0]?.toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return false;
  if (host.endsWith(".local")) return false;
  return APEX_HOSTS.has(host);
}

const PROD_WWW_ORIGIN = "https://www.clickanunt.ro";

/** Build 301 target on canonical www origin (path, query, hash preserved). */
export function buildWwwRedirectUrl(requestUrl: URL, forceProdWww = false): URL {
  const baseOrigin = forceProdWww || shouldRedirectApexToWww(requestUrl.hostname)
    ? PROD_WWW_ORIGIN
    : siteOrigin();
  const target = new URL(requestUrl.pathname + requestUrl.search, baseOrigin);
  if (requestUrl.hash) {
    target.hash = requestUrl.hash;
  }
  return target;
}
