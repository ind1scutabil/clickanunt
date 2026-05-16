/**
 * Security Headers Middleware - OWASP ASVS V14
 * 
 * Features:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { NextResponse } from 'next/server';
import {
  isLocalhostHostname,
  shouldApplyProductionTransportSecurity,
} from '@/lib/security/is-localhost-host';

export { isLocalhostHostname, shouldApplyProductionTransportSecurity };

/**
 * Content Security Policy configuration
 */
export function getCSPHeader(hostname?: string | null): string {
  const cspDirectives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js in dev
      "'unsafe-eval'", // Required for Next.js in dev
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://js.stripe.com', // Stripe.js
      'https://cdn.jsdelivr.net', // CDN for utilities
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and styled-jsx
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://www.clickanunt.ro',
    ],
    'media-src': ["'self'"],
    'connect-src': [
      "'self'",
      'https://www.google-analytics.com',
      'https://vitals.vercel-insights.com',
      'https://api.stripe.com', // Stripe API
    ],
    'frame-src': [
      'https://js.stripe.com', // Stripe 3DS frames
      'https://hooks.stripe.com',
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };

  // Production HTTPS only — skip on localhost (`npm start`) where TLS is unavailable.
  if (shouldApplyProductionTransportSecurity(hostname)) {
    cspDirectives['upgrade-insecure-requests'] = [];
  }

  // In development, relax CSP for hot reload (WebSocket HMR)
  if (process.env.NODE_ENV === 'development') {
    cspDirectives['connect-src'].push('ws:', 'wss:');
  }
  
  return Object.entries(cspDirectives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  hostname?: string | null
): NextResponse {
  const headers = response.headers;
  
  // Content Security Policy
  headers.set('Content-Security-Policy', getCSPHeader(hostname));
  
  // HTTP Strict Transport Security (HSTS) — 2 years; omitted on localhost only.
  if (shouldApplyProductionTransportSecurity(hostname)) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME-type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy, but doesn't hurt)
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=(self)',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );
  
  // Remove powered-by header
  headers.delete('X-Powered-By');
  
  // Cross-Origin policies - DISABLED for Stripe.js compatibility
  // Cross-Origin-Embedder-Policy blocks external scripts like Stripe.js
  // headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  // headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  return response;
}

/**
 * Security headers for API responses
 */
export function applyApiSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;
  
  // API-specific headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  // CORS headers (if needed)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

/**
 * Check if path requires authentication
 */
export function requiresAuth(pathname: string): boolean {
  const authRequiredPaths = [
    '/dashboard',
    '/listings/new',
    '/listings/edit',
    '/messages',
    '/favorites',
    '/api/listings/create',
    '/api/listings/update',
    '/api/listings/delete',
  ];
  
  return authRequiredPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if path is public API
 */
export function isPublicApi(pathname: string): boolean {
  const publicApiPaths = [
    '/api/listings',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/refresh',
    '/api/health',
  ];
  
  return publicApiPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if path is admin route
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

/**
 * Generate nonce for CSP
 */
export function generateNonce(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
}
