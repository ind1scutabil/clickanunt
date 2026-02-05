/**
 * Next.js Middleware pentru protecție globală
 * Rulează ÎNAINTE de orice request
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { rateLimitPresets } from './lib/rateLimit';

// Force Node.js runtime pentru crypto support
export const config = {
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Static assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};

// Rute care necesită autentificare
const PROTECTED_ROUTES = [
  '/admin',
  '/listings/new',
  '/api/admin',
  '/api/moderate',
];

// Rute publice (nu necesită auth)
const PUBLIC_ROUTES = [
  '/',
  '/listings',
  '/auth/login',
  '/auth/signup',
  '/terms',
  '/privacy',
  '/contact',
  '/api/auth/login',
  '/api/auth/register',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip pentru fișiere statice
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rate limiting pentru API
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = rateLimitPresets.api(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Prea multe cereri. Te rugăm să aștepți.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        }
      );
    }
  }

  // Verifică dacă ruta necesită autentificare
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Verifică token JWT
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    // Redirect la login pentru UI routes
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Returnează 401 pentru API routes
    return NextResponse.json(
      { error: 'Neautentificat. Token JWT necesar.' },
      { status: 401 }
    );
  }

  // Verifică token
  const payload = await verifyToken(token);

  if (!payload) {
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.json(
      { error: 'Token invalid sau expirat' },
      { status: 401 }
    );
  }

  // Verifică dacă user-ul este banat (ar trebui verificat în DB, dar e prea costisitor aici)
  // Această verificare se face în API routes

  // Adaugă user info în headers pentru API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-user-email', payload.email);
  response.headers.set('x-user-role', payload.role);

  return response;
}
