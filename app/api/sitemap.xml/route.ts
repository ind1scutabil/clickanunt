import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = 'https://www.clickanunt.ro';
  
  // Generate dynamic sitemap
  const routes = [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/listings', priority: 0.9, changefreq: 'hourly' },
    { path: '/auth/login', priority: 0.7, changefreq: 'monthly' },
    { path: '/auth/signup', priority: 0.7, changefreq: 'monthly' },
    { path: '/about', priority: 0.5, changefreq: 'monthly' },
    { path: '/contact', priority: 0.5, changefreq: 'monthly' },
    { path: '/privacy', priority: 0.4, changefreq: 'monthly' },
    { path: '/terms', priority: 0.4, changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `
  <url>
    <loc>${siteUrl}${route.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
