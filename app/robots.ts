import type { MetadataRoute } from "next";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Single source for `/robots.txt` (do not add `app/robots.txt/route.ts` — conflicts with metadata). */
export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listings", "/about", "/contact"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/_next/",
          "/auth/login",
          "/auth/signup",
        ],
      },
      { userAgent: "Googlebot", crawlDelay: 1 },
      { userAgent: "Bingbot", crawlDelay: 1 },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
