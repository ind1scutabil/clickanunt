import { NextResponse } from 'next/server';
import { generateRobotsTxt } from '@/lib/seo';

export const dynamic = 'force-static';

export async function GET() {
  const robotsTxt = generateRobotsTxt({
    disallow: [
      '/api/',
      '/admin/',
      '/dashboard/',
      '/_next/',
      '/auth/login',
      '/auth/signup',
    ],
    allow: [
      '/',
      '/listings',
      '/about',
      '/contact',
    ],
  });

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
