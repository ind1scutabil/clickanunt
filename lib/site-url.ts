/**
 * Canonical public origin for SEO, OpenGraph, sitemaps and JSON-LD.
 * Set `NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro` in production.
 * Unsafe or missing values in production resolve to `https://www.clickanunt.ro` (never localhost in live).
 */
const PROD_CANONICAL = 'https://www.clickanunt.ro';

function trimOrigin(raw: string | undefined): string {
  return raw?.trim().replace(/\/$/, '') ?? '';
}

function isUnsafePublicOrigin(url: string): boolean {
  const l = url.toLowerCase();
  return (
    l.includes('localhost') ||
    l.includes('127.0.0.1') ||
    /\b0\.0\.0\.0\b/.test(l) ||
    l.includes('staging') ||
    l.includes('vercel.app') ||
    l.startsWith('http://')
  );
}

export function siteOrigin(): string {
  const fromEnv = trimOrigin(process.env.NEXT_PUBLIC_SITE_URL) || trimOrigin(process.env.NEXT_PUBLIC_APP_URL);

  if (process.env.NODE_ENV !== 'production') {
    return fromEnv || 'http://localhost:3000';
  }

  if (!fromEnv) {
    return PROD_CANONICAL;
  }

  if (isUnsafePublicOrigin(fromEnv)) {
    return PROD_CANONICAL;
  }

  try {
    const u = new URL(fromEnv);
    if (u.hostname === 'clickanunt.ro') {
      return PROD_CANONICAL;
    }
  } catch {
    return PROD_CANONICAL;
  }

  return fromEnv;
}

/** Absolute URL for a path beginning with / (empty string ⇒ site origin only). */
export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!path || path === '/') return origin;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}
