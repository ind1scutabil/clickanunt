import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSitemapXML, type SitemapEntry } from "@/lib/seo";
import { LISTING_SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemap-constants";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, context: { params: Promise<{ chunk: string }> }) {
  const base = siteOriginForSeoFeeds();
  const { chunk } = await context.params;
  const idx = parseInt(chunk, 10);

  if (Number.isNaN(idx) || idx < 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (process.env.USE_IN_MEMORY_DB === "true") {
    const xml = generateSitemapXML([]);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=600",
      },
    });
  }

  const skip = idx * LISTING_SITEMAP_CHUNK_SIZE;

  const listings = await prisma.listing.findMany({
    where: seoIndexableListingWhere(),
    select: { id: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: LISTING_SITEMAP_CHUNK_SIZE,
    skip,
  });

  const entries: SitemapEntry[] = listings.map((l) => ({
    url: `${base}/listings/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const xml = generateSitemapXML(entries);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
