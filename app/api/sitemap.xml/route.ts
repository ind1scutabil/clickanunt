import { NextResponse } from "next/server";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

/**
 * Legacy `/api/sitemap.xml` — nu duplicăm XML aici; canonical = `/sitemap.xml` (MetadataRoute + sitemap-uri shard).
 */
export async function GET() {
  const canonical = `${siteOriginForSeoFeeds()}/sitemap.xml`;
  return NextResponse.redirect(canonical, 308);
}
