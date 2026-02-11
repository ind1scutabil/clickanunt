/**
 * API Route: Refresh Access Token
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { refreshTokenSchema } from "@/lib/security/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: refreshTokenSchema,
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

    const { refreshToken } = security.data as { refreshToken: string };

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la refresh token" },
      { status: 500 }
    );
  }
}
