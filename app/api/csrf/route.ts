import { NextResponse } from 'next/server';
import { generateCsrfToken, hashCsrfToken } from '@/lib/security/csrf';

export async function GET() {
  const token = generateCsrfToken();
  const hashed = hashCsrfToken(token);

  const response = NextResponse.json({ csrfToken: token });

  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('csrf-token', token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  response.cookies.set('csrf-token-hash', hashed, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2,
  });

  return response;
}