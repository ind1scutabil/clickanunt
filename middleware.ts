import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '';

async function verifyAdmin(token: string | null) {
  if (!token || !JWT_SECRET) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
      {
        issuer: 'autoplatform',
        audience: 'autoplatform-users',
      }
    );

    if ((payload.role === 'admin' || payload.role === 'owner') && payload.type === 'access') {
      return payload;
    }
  } catch (error) {
    // Ignore invalid tokens
  }

  return null;
}

function getTokenFromRequest(request: NextRequest) {
  const cookieToken = request.cookies.get('accessToken')?.value || null;
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  return cookieToken || headerToken;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);
  const admin = await verifyAdmin(token);

  if (admin) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
  }

  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
