import type { MetadataRoute } from "next";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";
import { isStagingSite } from "@/lib/staging/site-mode";

/** Single `/robots.txt` — keep disjoint from manual `robots.txt` route files. */
export default function robots(): MetadataRoute.Robots {
  if (isStagingSite()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  const base = siteOriginForSeoFeeds();
  const sitemaps = [
    `${base}/sitemap.xml`,
    `${base}/sitemap-categories.xml`,
    `${base}/sitemap-cities.xml`,
    `${base}/sitemap-listings.xml`,
    `${base}/sitemap-auto-hubs.xml`,
  ];

  /**
   * Block non-HTML API routes only. HTML private pages use server-side `noindex` —
   * crawlers must be allowed to fetch them so Google sees the robots meta tag.
   * Do not block `/_next/` (JS/CSS/assets required for rendering).
   */
  const technicalDisallow = ["/api/", "/api"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: technicalDisallow,
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: technicalDisallow,
      },
    ],
    sitemap: sitemaps,
    host: new URL(base).host,
  };
}
