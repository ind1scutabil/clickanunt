/**
 * API Route: Refresh Access Token
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
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

    let bodyRefreshToken: string | null = null;
    try {
      const body = (await request.json()) as { refreshToken?: unknown };
      if (typeof body?.refreshToken === 'string' && body.refreshToken.trim().length > 0) {
        bodyRefreshToken = body.refreshToken.trim();
      }
    } catch {
      // Allow empty body - we'll fallback to httpOnly cookie token
    }

    const cookieRefreshToken = request.cookies.get('refreshToken')?.value || null;
    const refreshToken = bodyRefreshToken || cookieRefreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    const json = NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });

    /** Aliniază cookie httpOnly cu access-ul din JSON — altfel SPA rămâne proaspăt, cookie-ul rămâne expirat. */
    if (result.accessToken) {
      const cookieDomain = cookieDomainFromRequest(request);
      const secureCookies = cookieSecureFromRequest(request);
      json.cookies.set("accessToken", result.accessToken, {
        httpOnly: true,
        secure: secureCookies,
        domain: cookieDomain,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        priority: "high",
      });
    }

    return json;
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la refresh token" },
      { status: 500 }
    );
  }
}
