import { NextResponse } from 'next/server';
import { generateCsrfToken, hashCsrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const token = generateCsrfToken();
  const hashed = hashCsrfToken(token);

  const response = NextResponse.json({ csrfToken: token });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const isProd = process.env.NODE_ENV === 'production';
  const cookieDomain = isProd ? '.clickanunt.ro' : undefined;

  response.cookies.set('csrf-token', token, {
    httpOnly: false,
    secure: isProd,
    domain: cookieDomain,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  response.cookies.set('csrf-token-hash', hashed, {
    httpOnly: true,
    secure: isProd,
    domain: cookieDomain,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  return response;
}