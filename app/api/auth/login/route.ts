export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFlag } from "@/lib/feature-flags";
import { validateSecureRequest } from "@/lib/security/middleware";
import { loginSchema } from "@/lib/security/validation-schemas";
import { runSharedPasswordLogin } from "@/lib/auth/login-shared";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    await db.testConnection();

    // A2: Log request details for debugging
    const requestHost = request.headers.get('host') || 'unknown';
    const requestOrigin = request.headers.get('origin') || 'unknown';
    console.log('[LOGIN ROUTE] Incoming request:', {
      host: requestHost,
      origin: requestOrigin,
      timestamp: new Date().toISOString()
    });

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'login',
      schema: loginSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      
      console.error('[LOGIN ROUTE] Security validation failed:', {
        error: security.error
      });
      
      return NextResponse.json({ 
        error: security.error
      }, { status });
    }

    const { email, password } = security.data as { email: string; password: string };

    const shared = await runSharedPasswordLogin(request, email, password);

    if (shared.kind === "failure") {
      return NextResponse.json(shared.body, { status: shared.status });
    }

    if (shared.kind === "two_factor") {
      return NextResponse.json(shared.body, { status: shared.status });
    }

    const result = shared;

    // Setează cookie-uri HTTP-only pentru securitate
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        message: "Conectat cu succes",
      },
      { status: 200 }
    );

    const cookieDomain = cookieDomainFromRequest(request);
    const secureCookies = cookieSecureFromRequest(request);

    // Set access token cookie (7 zile) - Safari compatible
    response.cookies.set('accessToken', result.accessToken!, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: 'lax',  // Changed from 'strict' to allow fetch() requests
      maxAge: 60 * 60 * 24 * 7, // 7 zile
      path: '/',
      priority: 'high',
    });

    // Set refresh token cookie (30 zile) - Safari compatible
    response.cookies.set('refreshToken', result.refreshToken!, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: 'lax',  // Changed from 'strict' to allow fetch() requests
      maxAge: 60 * 60 * 24 * 30, // 30 zile
      path: '/',
      priority: 'high',
    });
    
    // Adaugă header-e CORS pentru Safari
    const origin = request.headers.get('origin');
    const strictCors = getFlag('enterprise_security_hardening');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
    ].filter((value): value is string => Boolean(value));

    const canSetOrigin = !origin
      ? false
      : !strictCors
      ? true
      : allowedOrigins.includes(origin);

    if (origin && canSetOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Vary', 'Origin');
    }

    return response;
  } catch (err: any) {
    console.error('❌ Login error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return NextResponse.json(
      { 
        error: "Eroare la autentificare",
        ...(process.env.NODE_ENV === 'development' && { debug: err.message })
      },
      { status: 500 }
    );
  }
}
