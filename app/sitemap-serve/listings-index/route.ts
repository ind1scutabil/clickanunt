import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSitemapIndexXml } from "@/lib/seo";
import { LISTING_SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemap-constants";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const base = siteOriginForSeoFeeds();

  if (process.env.USE_IN_MEMORY_DB === "true") {
    const xml = generateSitemapIndexXml([]);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=600",
      },
    });
  }

  const count = await prisma.listing.count({
    where: seoIndexableListingWhere(),
  });

  const chunks = Math.ceil(count / LISTING_SITEMAP_CHUNK_SIZE);
  const locs =
    chunks > 0 ? Array.from({ length: chunks }, (_, i) => `${base}/sitemap-listings-${i}.xml`) : [];

  const xml = generateSitemapIndexXml(locs);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
