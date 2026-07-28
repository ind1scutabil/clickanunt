import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { LISTING_SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemap-constants";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";
import {
  canonicalizeSitemapImageUrl,
  isEligibleSitemapImageUrl,
} from "@/lib/seo/sitemap-image-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** True when the upload object exists on local disk (prod/release uploads symlink). */
function localUploadExists(absoluteHttpsUrl: string): boolean {
  try {
    const u = new URL(absoluteHttpsUrl);
    let rel: string | null = null;
    if (u.pathname.startsWith("/api/uploads/serve")) {
      const key = u.searchParams.get("key");
      if (!key) return false;
      rel = key;
    } else if (u.pathname.startsWith("/uploads/")) {
      rel = u.pathname.slice("/uploads/".length);
    }
    if (!rel) return false;
    // prevent escaping uploads root
    const resolved = path.resolve(UPLOAD_ROOT, rel);
    if (!resolved.startsWith(UPLOAD_ROOT + path.sep) && resolved !== UPLOAD_ROOT) {
      return false;
    }
    return existsSync(resolved);
  } catch {
    return false;
  }
}


/**
 * Google image sitemap for public indexable listings only.
 * Photos are listing.photos JSON string array of relative/absolute URLs.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ chunk: string }> }
) {
  const base = siteOriginForSeoFeeds();
  const { chunk } = await context.params;
  const idx = parseInt(chunk, 10);
  if (Number.isNaN(idx) || idx < 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (process.env.USE_IN_MEMORY_DB === "true") {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n</urlset>`;
    return new NextResponse(empty, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  const skip = idx * LISTING_SITEMAP_CHUNK_SIZE;
  const listings = await prisma.listing.findMany({
    where: seoIndexableListingWhere(),
    select: { id: true, title: true, updatedAt: true, photos: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: LISTING_SITEMAP_CHUNK_SIZE,
    skip,
  });

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
  ];

  for (const listing of listings) {
    const photos = Array.isArray(listing.photos)
      ? listing.photos.filter((p): p is string => typeof p === "string" && p.length > 0)
      : [];
    if (photos.length === 0) continue;

    const seen = new Set<string>();
    const imageLocs: string[] = [];
    for (const photo of photos) {
      if (imageLocs.length >= 10) break;
      const imageLoc = canonicalizeSitemapImageUrl(photo, base);
      if (!imageLoc || !isEligibleSitemapImageUrl(imageLoc)) continue;
      if (!localUploadExists(imageLoc)) continue;
      if (seen.has(imageLoc)) continue;
      seen.add(imageLoc);
      imageLocs.push(imageLoc);
    }
    if (imageLocs.length === 0) continue;

    const pageUrl = `${base}/listings/${listing.id}`;
    parts.push(`  <url>`);
    parts.push(`    <loc>${xmlEscape(pageUrl)}</loc>`);
    parts.push(`    <lastmod>${listing.updatedAt.toISOString().slice(0, 10)}</lastmod>`);
    for (const imageLoc of imageLocs) {
      parts.push(`    <image:image>`);
      parts.push(`      <image:loc>${xmlEscape(imageLoc)}</image:loc>`);
      if (listing.title) {
        parts.push(`      <image:title>${xmlEscape(listing.title.slice(0, 120))}</image:title>`);
      }
      parts.push(`    </image:image>`);
    }
    parts.push(`  </url>`);
  }

  parts.push(`</urlset>`);
  return new NextResponse(parts.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
