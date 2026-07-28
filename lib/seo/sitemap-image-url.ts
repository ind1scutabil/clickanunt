/**
 * Canonicalize listing photo URLs for Google image sitemaps.
 * Never emit localhost / private hosts; rewrite loopback upload paths onto the SEO origin.
 */
export function canonicalizeSitemapImageUrl(photo: string, base: string): string | null {
  try {
    const origin = new URL(base);
    let u: URL;
    if (photo.startsWith("/")) {
      u = new URL(photo, origin);
    } else if (!/^https?:\/\//i.test(photo)) {
      u = new URL(`/${photo.replace(/^\/+/, "")}`, origin);
    } else {
      u = new URL(photo);
    }

    const host = u.hostname.toLowerCase();
    const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const isCanonical = host === origin.hostname.toLowerCase();
    const isUploadPath =
      u.pathname.startsWith("/api/uploads/serve") || u.pathname.startsWith("/uploads/");

    if (!isCanonical) {
      if (isLoopback && isUploadPath) {
        u = new URL(`${u.pathname}${u.search}`, origin);
      } else {
        return null;
      }
    }

    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
