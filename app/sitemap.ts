import type { MetadataRoute } from "next";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

/**
 * Lightweight core sitemap (static/browse). Listing + market URLs live in chunked sitemaps
 * reachable from `robots.ts` (`sitemap-listings.xml`, `sitemap-categories.xml`, …).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOriginForSeoFeeds();
  const now = new Date();

  const paths = [
    { path: "/", changeFrequency: "daily" as const, priority: 1 },
    { path: "/listings", changeFrequency: "hourly" as const, priority: 0.95 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/security", changeFrequency: "yearly" as const, priority: 0.35 },
    { path: "/business", changeFrequency: "monthly" as const, priority: 0.45 },
  ];

  return paths.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
