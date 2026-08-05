import type { MetadataRoute } from "next";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

/**
 * Lightweight core sitemap (static/browse). Listing + market URLs live in chunked sitemaps
 * reachable from `robots.ts` (`sitemap-listings.xml`, `sitemap-categories.xml`, …).
 *
 * lastmod: use SEO_STATIC_LASTMOD (YYYY-MM-DD) when set; otherwise omit to avoid
 * regenerating a fake "today" on every request.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOriginForSeoFeeds();
  const staticLastmod = process.env.SEO_STATIC_LASTMOD?.trim();
  const lastModified =
    staticLastmod && /^\d{4}-\d{2}-\d{2}$/.test(staticLastmod)
      ? new Date(`${staticLastmod}T00:00:00.000Z`)
      : undefined;

  const paths = [
    { path: "/", changeFrequency: "daily" as const, priority: 1 },
    { path: "/listings", changeFrequency: "hourly" as const, priority: 0.95 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly" as const, priority: 0.28 },
    { path: "/gdpr", changeFrequency: "yearly" as const, priority: 0.28 },
    { path: "/anunturi-interzise", changeFrequency: "yearly" as const, priority: 0.25 },
    { path: "/anti-frauda", changeFrequency: "yearly" as const, priority: 0.25 },
    { path: "/rambursari", changeFrequency: "yearly" as const, priority: 0.25 },
    { path: "/notice-takedown", changeFrequency: "yearly" as const, priority: 0.25 },
    { path: "/litigii-ue", changeFrequency: "yearly" as const, priority: 0.22 },
    { path: "/business", changeFrequency: "monthly" as const, priority: 0.45 },
    { path: "/harta-site", changeFrequency: "weekly" as const, priority: 0.55 },
  ];

  return paths.map((p) => ({
    url: `${base}${p.path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
