import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTPLogin, useBackupCode as consumeBackupCode } from '@/lib/2fa';
import { getSession, deleteSession, RedisUnavailableError } from '@/lib/redis';
import { issueAuthTokenPair } from '@/lib/auth';
import { validateSecureRequest } from '@/lib/security/middleware';
import { verify2FASchema } from '@/lib/security/validation-schemas';
import { ANALYTICS_EVENT, recordAnalyticsEvent } from '@/lib/analytics-events';
import { cookieDomainFromRequest, cookieSecureFromRequest } from '@/lib/cookie-domain';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'login',
      schema: verify2FASchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { sessionToken, code, backupCode } = security.data as {
      sessionToken: string;
      code?: string;
      backupCode?: string;
    };
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    if (!sessionToken || (!code && !backupCode)) {
      return NextResponse.json(
        { error: 'Session token și cod sunt necesare' },
        { status: 400 }
      );
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Type guard for session data
    if (typeof session !== 'object' || !session || !('userId' in session)) {
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 500 }
      );
    }

    const userId = (session as { userId: string }).userId;

    if (backupCode) {
      const isValid = await consumeBackupCode(userId, backupCode, ip, userAgent);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Backup code invalid' },
          { status: 401 }
        );
      }
    } else if (code) {
      const isValid = await verifyTOTPLogin(userId, code, ip, userAgent);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Cod invalid' },
          { status: 401 }
        );
      }
    }

    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true, sessionVersion: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = typeof user.role === "string" && user.role ? user.role : "user";
    const { accessToken, refreshToken } = await issueAuthTokenPair({
      id: user.id,
      email: user.email,
      role,
      sessionVersion: user.sessionVersion,
    });
    await deleteSession(sessionToken);

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.login_success,
      userId: user.id,
      metadata: { via: '2fa', ip: ip ?? null },
      request,
    });

    const response = NextResponse.json(
      {
        success: true,
        user,
        message: '2FA verification successful',
      },
      { status: 200 }
    );

    const cookieDomain = cookieDomainFromRequest(request);
    const secureCookies = cookieSecureFromRequest(request);

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { error: '2FA temporar indisponibil (Redis offline)' },
        { status: 503 }
      );
    }

    console.error('Error during 2FA verification:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
