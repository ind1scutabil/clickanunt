import { NextResponse } from "next/server";
import { generateSitemapXML } from "@/lib/seo";
import { buildCategorySitemapEntries } from "@/lib/seo/sitemap-queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const entries = await buildCategorySitemapEntries();
  const xml = generateSitemapXML(entries);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
