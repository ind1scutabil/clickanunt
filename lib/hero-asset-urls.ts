/**
 * Hero assets from /public. `?v=…` forces reload after regenerating files (Safari localhost cache).
 */
const envRev =
  typeof process.env.NEXT_PUBLIC_HERO_ASSET_REV === "string"
    ? process.env.NEXT_PUBLIC_HERO_ASSET_REV.trim()
    : "";

/** Bump when hero WebP/AVIF are rebuilt. */
const DEV_HERO_CACHE_REV = "bmw-hero-v5-fixed-slot-avif";

const rev =
  envRev || (process.env.NODE_ENV === "development" ? DEV_HERO_CACHE_REV : "");

function withRev(path: string): string {
  if (!rev) return path;
  return `${path}?v=${encodeURIComponent(rev)}`;
}

export const HERO_DESKTOP_URL = withRev("/images/hero/hero-bmw-i7-desktop.webp");
export const HERO_MOBILE_URL = withRev("/images/hero/hero-bmw-i7-mobile.webp");
export const HERO_DESKTOP_AVIF = withRev("/images/hero/hero-bmw-i7-desktop.avif");
export const HERO_MOBILE_AVIF = withRev("/images/hero/hero-bmw-i7-mobile.avif");
