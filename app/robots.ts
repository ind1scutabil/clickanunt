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

  const privatePaths = [
    "/api/",
    "/admin/",
    "/dashboard/",
    "/account/",
    "/auth/",
    "/login/",
    "/register/",
    "/messages/",
    "/test-login/",
    "/ui-demo/",
    "/car-catalog-demo/",
    "/listings/*/edit",
    "/listings/*/promote/",
    "/listings/*/messages",
    "/_next/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listings/", "/about", "/contact", "/business", "/security"],
        disallow: privatePaths,
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: privatePaths,
      },
    ],
    sitemap: sitemaps,
    host: new URL(base).host,
  };
}
