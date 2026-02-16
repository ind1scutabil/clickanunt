/**
 * Dynamic Sitemap Generation
 * SEO-optimized sitemap with listings
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Static pages
    const staticPages = [
      { url: '/', priority: 1.0, changefreq: 'daily' },
      { url: '/listings', priority: 0.9, changefreq: 'hourly' },
      { url: '/auth/login', priority: 0.5, changefreq: 'monthly' },
      { url: '/auth/signup', priority: 0.5, changefreq: 'monthly' },
      { url: '/terms', priority: 0.3, changefreq: 'monthly' },
      { url: '/privacy', priority: 0.3, changefreq: 'monthly' },
      { url: '/contact', priority: 0.4, changefreq: 'monthly' },
    ];

    // Active listings (limit to 50000 for sitemap size)
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
        moderationStatus: 'approved',
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50000,
    });

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map((page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${listings.map((listing: any) => `  <url>
    <loc>${baseUrl}/listings/${listing.id}</loc>
    <lastmod>${listing.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: any) {
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
