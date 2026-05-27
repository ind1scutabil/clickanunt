/** Canonical production origin — API + publish must use www (apex POST /api/* was 301→GET). */
export const CANONICAL_WWW_ORIGIN = 'https://www.clickanunt.ro';

export function isApexHostname(hostname: string): boolean {
  return hostname.split(':')[0]?.toLowerCase() === 'clickanunt.ro';
}

/** Full-page redirect: apex HTML → www (same path/query). */
export function redirectApexBrowserToWww(): void {
  if (typeof window === 'undefined') return;
  if (!isApexHostname(window.location.hostname)) return;
  const target = `${CANONICAL_WWW_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}

/**
 * Resolve relative API paths to www when the SPA is on bare apex.
 * Keeps cookies (.clickanunt.ro) while avoiding edge 301 on POST.
 */
export function resolveClientApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && isApexHostname(window.location.hostname)) {
    return `${CANONICAL_WWW_ORIGIN}${normalized}`;
  }
  return normalized;
}
