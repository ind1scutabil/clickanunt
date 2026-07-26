/**
 * Verified brand social profile URLs for Footer + Organization JSON-LD `sameAs`.
 * Only absolute HTTPS profiles with a non-empty path are accepted — never invent URLs.
 * Optional env (do not invent values; leave unset until brand confirms):
 * - NEXT_PUBLIC_BRAND_FACEBOOK_URL
 * - NEXT_PUBLIC_BRAND_INSTAGRAM_URL
 * - NEXT_PUBLIC_BRAND_TWITTER_URL
 * - NEXT_PUBLIC_BRAND_X_URL
 */

const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "linkedin.com",
  "www.linkedin.com",
  "youtube.com",
  "www.youtube.com",
  "www.tiktok.com",
  "tiktok.com",
]);

/** Generic network roots / placeholders — never publish as brand sameAs. */
const GENERIC_ROOT_PATHS = new Set(["", "/"]);

export function sanitizeBrandSocialUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[\s<>"']/.test(trimmed)) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (!SOCIAL_HOSTS.has(host)) return null;

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (GENERIC_ROOT_PATHS.has(path) || path === "/") return null;

  // Reject bare network roots like https://facebook.com or https://www.facebook.com/
  if (/^https:\/\/(www\.)?(facebook|instagram|twitter|x)\.com\/?$/i.test(trimmed.replace(/\?.*$/, ""))) {
    return null;
  }

  url.hash = "";
  // Drop tracking query noise; keep path only for stable identity
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

export type BrandSocialLinks = {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
};

export function getVerifiedBrandSocialLinks(
  env: NodeJS.ProcessEnv = process.env,
): BrandSocialLinks {
  return {
    facebook: sanitizeBrandSocialUrl(env.NEXT_PUBLIC_BRAND_FACEBOOK_URL),
    instagram: sanitizeBrandSocialUrl(env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL),
    twitter:
      sanitizeBrandSocialUrl(env.NEXT_PUBLIC_BRAND_TWITTER_URL) ||
      sanitizeBrandSocialUrl(env.NEXT_PUBLIC_BRAND_X_URL),
  };
}

/** Ordered absolute HTTPS URLs for schema.org sameAs (omit empty). */
export function getVerifiedBrandSameAsUrls(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const links = getVerifiedBrandSocialLinks(env);
  return [links.facebook, links.instagram, links.twitter].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
}
