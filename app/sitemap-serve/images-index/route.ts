import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LISTING_SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemap-constants";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const base = siteOriginForSeoFeeds();
  let count = 0;
  if (process.env.USE_IN_MEMORY_DB !== "true") {
    count = await prisma.listing.count({ where: seoIndexableListingWhere() });
  }
  const chunks = Math.max(1, Math.ceil(count / LISTING_SITEMAP_CHUNK_SIZE) || 1);
  const today = new Date().toISOString().slice(0, 10);

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...Array.from({ length: chunks }, (_, i) =>
      [
        `  <sitemap>`,
        `    <loc>${base}/sitemap-images-${i}.xml</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `  </sitemap>`,
      ].join("\n")
    ),
    `</sitemapindex>`,
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
