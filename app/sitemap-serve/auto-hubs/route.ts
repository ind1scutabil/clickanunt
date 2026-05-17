import { NextResponse } from 'next/server';
import { generateSitemapXML } from '@/lib/seo';
import { buildAutoHubSitemapEntries } from '@/lib/seo/auto-hub-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Make / model / model+city auto hubs (`/auto/{make}`, …) with real inventory. */
export async function GET() {
  const entries = await buildAutoHubSitemapEntries();
  const xml = generateSitemapXML(entries);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
