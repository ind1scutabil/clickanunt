import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, hashCsrfToken } from '@/lib/security/csrf';
import { cookieDomainFromRequest, cookieSecureFromRequest } from '@/lib/cookie-domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = generateCsrfToken();
  const hashed = hashCsrfToken(token);

  const response = NextResponse.json({ csrfToken: token });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const cookieDomain = cookieDomainFromRequest(request);
  const secure = cookieSecureFromRequest(request);

  /** lax — ca auth cookies; strict poate lipsi la prima navigare cross-site și blochează POST (mesaje etc.). */
  response.cookies.set('csrf-token', token, {
    httpOnly: false,
    secure,
    domain: cookieDomain,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  response.cookies.set('csrf-token-hash', hashed, {
    httpOnly: true,
    secure,
    domain: cookieDomain,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  return response;
}