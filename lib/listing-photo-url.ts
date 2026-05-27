/**
 * Normalize listing photo URLs for display.
 * - Pozele sunt salvate uneori cu altă origine (localhost, clickanunt.ro vs www) → refacem calea pe domeniul curent pentru /uploads/
 * - Nu folosim imagini Unsplash / stock / categorie ca fallback pentru anunțuri
 * - normalizeListingPhotosArray returnează doar URL-uri permise (încărcări reale)
 */

/**
 * UI fallback when `listing.photos` is empty — static file under `public/images/`.
 * Not added to API responses; components use this at render time only.
 */
export const DEFAULT_LISTING_IMAGE_URL = "/images/default-listing.jpg";

/**
 * SVG fallback when a real image fails to load (broken URL, etc.).
 * Use in `onError` only — do not use the JPEG here or a missing file can loop reloads.
 */
export const LISTING_PHOTO_ONERROR_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
<defs>
<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#2c3140"/>
<stop offset="45%" stop-color="#1a1e28"/>
<stop offset="100%" stop-color="#12151c"/>
</linearGradient>
<radialGradient id="h" cx="50%" cy="0%" r="75%">
<stop offset="0%" stop-color="rgba(255,255,255,0.07)"/>
<stop offset="55%" stop-color="rgba(255,255,255,0)"/>
</radialGradient>
</defs>
<rect width="1200" height="720" fill="url(#g)"/>
<rect width="1200" height="720" fill="url(#h)"/>
<g opacity="0.22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.25">
<path d="M0 520 C200 480 400 560 600 500 S1000 420 1200 460"/>
<path d="M0 560 C240 520 480 600 720 540 S1040 480 1200 500"/>
</g>
<g opacity="0.35" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round">
<rect x="460" y="250" width="280" height="200" rx="14"/>
<circle cx="600" cy="340" r="36"/>
<path d="M500 410 L560 360 L620 400 L700 320"/>
</g>
</svg>`
  );

/** @deprecated Prefer DEFAULT_LISTING_IMAGE_URL — kept for existing imports (empty-photo UI). */
export const LISTING_PHOTO_PLACEHOLDER = DEFAULT_LISTING_IMAGE_URL;

/**
 * Draft upload paths (`.../listings/temp-<id>/...`) must never be shown as final listing imagery.
 * Matches both `/uploads/listings/temp-` and app-relative `/listings/temp-`.
 */
export function isDraftTempListingPhotoUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return /\/listings\/temp-/i.test(u);
}

function rewriteTempUploadsToServeUrl(raw: string, originOverride?: string): string {
  const t = raw.trim();
  if (!/\/listings\/temp-/i.test(t) && !/\/uploads\/listings\/temp-/i.test(t) && !/^listings\/temp-/i.test(t) && !/^uploads\/listings\/temp-/i.test(t)) {
    return raw;
  }

  try {
    let pathname = '';
    if (/^https?:\/\//i.test(t)) {
      pathname = new URL(t).pathname;
    } else if (t.startsWith('//')) {
      pathname = new URL(`https:${t}`).pathname;
    } else if (t.startsWith('/')) {
      pathname = t;
    } else if (/^uploads\//i.test(t)) {
      pathname = `/${t}`;
    } else if (/^listings\//i.test(t)) {
      pathname = `/${t}`;
    } else {
      return raw;
    }

    let key = '';
    if (pathname.startsWith('/uploads/')) {
      key = pathname.slice('/uploads/'.length);
    } else if (pathname.startsWith('/listings/')) {
      key = pathname.slice(1); // remove leading '/'
    } else {
      return raw;
    }

    if (!/^listings\/temp-/i.test(key)) return raw;

    const origin = siteOriginForNormalization(originOverride);
    const servePath = `/api/uploads/serve?key=${encodeURIComponent(key)}`;
    const originLc = origin.toLowerCase();
    const isLocalOrigin =
      originLc.includes("localhost") || originLc.includes("127.0.0.1");
    const isHttpOrigin = originLc.startsWith("http://");
    return origin && !isLocalOrigin && !isHttpOrigin ? `${origin}${servePath}` : servePath;
  } catch {
    return raw;
  }
}

/** Set by React Native so /uploads/ paths rewrite to the same host as the API (iOS/Android parity with web). */
let listingPhotoSiteOriginOverride: string | null = null;

export function setListingPhotoSiteOriginOverride(origin: string | null): void {
  listingPhotoSiteOriginOverride = origin?.replace(/\/$/, '') ?? null;
}

function siteOriginForNormalization(originOverride?: string): string {
  if (originOverride) {
    return originOverride.replace(/\/$/, '');
  }
  if (listingPhotoSiteOriginOverride) {
    return listingPhotoSiteOriginOverride;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const fromEnv =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')) ||
    '';
  return fromEnv;
}

function isBlockedStockOrPlaceholderUrl(t: string): boolean {
  const lower = t.toLowerCase();
  /** Homepage marketing hero — must never appear as listing gallery imagery */
  if (/\/images\/hero\//i.test(lower) || /hero-bmw-i7/i.test(lower)) return true;
  if (/images\.unsplash\.com/i.test(lower)) return true;
  if (/picsum\.photo/i.test(lower)) return true;
  if (/via\.placeholder\.com/i.test(lower)) return true;
  if (/placehold\.co/i.test(lower)) return true;
  if (/placekitten\.com/i.test(lower)) return true;
  if (/loremflickr\.com/i.test(lower)) return true;
  if (/example\.com\/.*(photo|image)/i.test(lower)) return true;
  return false;
}

function isOurSiteHost(h: string): boolean {
  const hl = h.toLowerCase();
  return hl === 'clickanunt.ro' || hl === 'www.clickanunt.ro' || hl.endsWith('.clickanunt.ro');
}

/** Doar domeniul app (fără subdomenii CDN) — pentru rescriere origin fără a rupe URL-uri pe cdn.*. */
function isOurSiteAppHost(h: string): boolean {
  const hl = h.toLowerCase();
  return hl === 'clickanunt.ro' || hl === 'www.clickanunt.ro';
}

function isLocalDevHost(h: string): boolean {
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.startsWith('localhost:') ||
    h.startsWith('127.0.0.1:')
  );
}

function isObjectStorageHost(h: string): boolean {
  const hl = h.toLowerCase();
  return (
    hl.includes('amazonaws.com') ||
    hl.includes('cloudfront.net') ||
    hl.includes('r2.dev') ||
    hl.includes('r2.cloudflarestorage.com') ||
    hl.includes('digitaloceanspaces.com') ||
    hl.includes('supabase.co') ||
    hl.includes('storage.googleapis.com') ||
    hl.includes('blob.core.windows.net')
  );
}

function cdnOrAppHostMatches(hostname: string): boolean {
  const hl = hostname.toLowerCase();
  const envUrls = [
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CDN_URL : undefined,
    typeof process !== 'undefined' ? process.env.CDN_URL : undefined,
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL : undefined,
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : undefined,
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined,
  ].filter(Boolean) as string[];

  for (const raw of envUrls) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      if (u.hostname.toLowerCase() === hl) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * URL permis pentru afișare la anunț: încărcări /uploads/, stocare obiect, CDN configurat, fără stock injectat.
 */
export function isValidListingPhotoUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  // Draft upload keys (temp-*) must not be shown as final listing imagery.
  if (isDraftTempListingPhotoUrl(t)) return false;
  if (t.startsWith('blob:')) return true;

  if (isBlockedStockOrPlaceholderUrl(t)) return false;

  if (t.startsWith('/api/uploads/serve')) return true;
  if (t.startsWith('/uploads/')) return true;
  if (/^uploads\//i.test(t)) return true;

  /** Căi relative la stocare (aceeași structură ca la upload: listings/{id}/size/...) */
  if (t.startsWith('/listings/')) return true;
  if (/^listings\//i.test(t)) return true;

  if (t.startsWith('//')) {
    if (isBlockedStockOrPlaceholderUrl(`https:${t}`)) return false;
    try {
      const u = new URL(`https:${t}`);
      return isValidListingPhotoUrl(u.toString());
    } catch {
      return false;
    }
  }

  if (!/^https?:\/\//i.test(t)) return false;

  try {
    const u = new URL(t);
    if (isBlockedStockOrPlaceholderUrl(u.href)) return false;

    const path = u.pathname;

    // Local-upload fallback: images are served through a backend route.
    if (path.startsWith('/api/uploads/serve')) return true;

    // Accept our own storage URL patterns even if CDN/app host matching envs are stale.
    // uploadImage() stores objects under:
    // - /listings/{listingId}/{thumb|medium|large|original}/{...}
    // - local fallback stores under /uploads/{sameKey...}
    // This makes the client robust to CDN host changes without requiring a full rebuild.
    if (
      /^\/(?:uploads\/)?listings\/[0-9a-fA-F-]{36}\/(thumb|medium|large|original)\/.+/i.test(path)
    ) {
      return true;
    }

    if (path.startsWith('/uploads/')) return true;

    if (isOurSiteHost(u.hostname) && (path.startsWith('/uploads/') || path.includes('/listings/'))) {
      return true;
    }

    if (isLocalDevHost(u.hostname) && (path.startsWith('/uploads/') || path.includes('/listings/'))) {
      return true;
    }

    if (path.includes('/listings/') && (isObjectStorageHost(u.hostname) || cdnOrAppHostMatches(u.hostname))) {
      return true;
    }

    if (
      cdnOrAppHostMatches(u.hostname) &&
      (path.startsWith('/uploads/') || path.includes('/listings/'))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Reface /uploads/... pe originea curentă când în DB e salvat alt host (www vs apex, localhost în prod).
 * URL-uri S3/R2 rămân neschimbate (path nu e de obicei /uploads/ pe același pattern local).
 */
function rewriteUploadsToSiteOrigin(t: string, originOverride?: string): string {
  const origin = siteOriginForNormalization(originOverride);
  if (!origin) {
    try {
      if (/^https?:\/\//i.test(t)) {
        const u = new URL(t);
        u.protocol = 'https:';
        return u.toString();
      }
    } catch {
      /* ignore */
    }
    return t;
  }

  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const path = u.pathname + u.search;
      /** Poze servite din app la /uploads/ — refacem originul chiar dacă în DB e IP, localhost sau domeniu vechi */
      const originLc = origin.toLowerCase();
      const isLocalOrigin =
        originLc.includes('localhost') || originLc.includes('127.0.0.1');
      const isHttpOrigin = originLc.startsWith('http://');

      if (path.startsWith('/uploads/')) {
        return isLocalOrigin || isHttpOrigin ? path : `${origin}${path}`;
      }
      /** Local-upload fallback served via API route (must keep local http origin). */
      if (path.startsWith('/api/uploads/serve')) {
        return isLocalOrigin || isHttpOrigin ? path : `${origin}${path}`;
      }
      /** Poze la /listings/ servite de app pe apex/www — aliniere www/apex (nu rescriem cdn.*) */
      if (path.startsWith('/listings/') && isOurSiteAppHost(u.hostname)) {
        return isLocalOrigin || isHttpOrigin ? path : `${origin}${path}`;
      }
      u.protocol = 'https:';
      return u.toString();
    }
    if (t.startsWith('/')) {
      // Keep internal serve routes relative to avoid accidentally forcing `http://...`
      // on an HTTPS page.
      if (t.startsWith('/api/uploads/serve') || t.startsWith('/uploads/')) {
        return t;
      }
      return `${origin}${t}`;
    }
    /** Cale relativă fără slash inițial (ex. uploads/listings/...) */
    if (/^uploads\//i.test(t)) {
      return `${origin}/${t}`;
    }
    if (/^listings\//i.test(t)) {
      return `${origin}/${t}`;
    }
  } catch {
    return t;
  }
  return t;
}

export function normalizeListingPhotoUrl(
  photo: string | undefined | null,
  originOverride?: string
): string {
  if (photo == null || typeof photo !== 'string') return '';
  const t = photo.trim();
  if (!t) return '';
  if (t.startsWith('blob:')) return t;

  // If DB has historical "temp-..." upload paths, rewrite them to the
  // dynamic local-file serving route so they can display after deploy.
  const rewritten = rewriteTempUploadsToServeUrl(t, originOverride);
  if (!isValidListingPhotoUrl(rewritten)) return '';

  // Ensure internal serve-route URLs are returned as relative paths.
  // This prevents accidental `http://...` absolute URLs (mixed content on HTTPS).
  if (/^https?:\/\//i.test(rewritten)) {
    try {
      const u = new URL(rewritten);
      if (u.pathname.startsWith('/api/uploads/serve')) {
        return `${u.pathname}${u.search}`;
      }
    } catch {
      /* ignore */
    }
  }

  if (rewritten.startsWith('//')) {
    return rewriteUploadsToSiteOrigin(`https:${rewritten}`, originOverride);
  }

  if (/^https?:\/\//i.test(rewritten)) {
    return rewriteUploadsToSiteOrigin(rewritten, originOverride);
  }

  if (rewritten.startsWith('/')) {
    return rewriteUploadsToSiteOrigin(rewritten, originOverride);
  }

  if (/^uploads\//i.test(rewritten)) {
    return rewriteUploadsToSiteOrigin(`/${rewritten}`, originOverride);
  }

  if (/^listings\//i.test(rewritten)) {
    return rewriteUploadsToSiteOrigin(`/${rewritten}`, originOverride);
  }

  return rewritten;
}

function isArrayLikeRecord(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const keys = Object.keys(val as object);
  if (keys.length === 0) return false;
  return keys.every((k) => /^\d+$/.test(k));
}

function stringListFromUnknown(x: unknown): string {
  if (typeof x === 'string') return x.trim();
  if (x == null) return '';
  return String(x).trim();
}

/**
 * Normalizează array-ul din API: doar URL-uri valide pentru afișare (fără stock / categorie).
 */
export function normalizeListingPhotosArray(
  raw: unknown,
  originOverride?: string
): string[] {
  if (raw == null) return [];

  let candidates: string[] = [];

  if (Array.isArray(raw)) {
    candidates = raw.map(stringListFromUnknown).filter((s) => s.length > 0);
  } else if (isArrayLikeRecord(raw)) {
    const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
    candidates = keys.map((k) => stringListFromUnknown(raw[k])).filter((s) => s.length > 0);
  } else if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s) as unknown;
      return normalizeListingPhotosArray(p);
    } catch {
      candidates = [s];
    }
  } else {
    return [];
  }

  const out: string[] = [];
  for (const c of candidates) {
    const n = normalizeListingPhotoUrl(c, originOverride);
    if (n) out.push(n);
  }
  return out;
}

/**
 * Prima poză afișabilă pentru carduri / sidebar, sau placeholder neutru.
 */
export function listingPrimaryPhotoSrc(photos: unknown, secondary?: unknown): string {
  const primary = normalizeListingPhotosArray(photos);
  if (primary.length > 0) return primary[0];
  const extra = normalizeListingPhotosArray(secondary);
  if (extra.length > 0) return extra[0];
  return DEFAULT_LISTING_IMAGE_URL;
}
