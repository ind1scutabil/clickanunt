export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFlag } from "@/lib/feature-flags";
import { validateSecureRequest } from "@/lib/security/middleware";
import { loginSchema } from "@/lib/security/validation-schemas";
import { runSharedPasswordLogin } from "@/lib/auth/login-shared";

/**
 * POST /api/auth/mobile-login
 * Same JSON body and success shape as POST /api/auth/login, without CSRF.
 * Does not set httpOnly cookies (mobile uses Bearer tokens from JSON).
 */
export async function POST(request: NextRequest) {
  try {
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "login",
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
      return NextResponse.json({ error: security.error }, { status });
    }

    const { email, password } = security.data as { email: string; password: string };

    const shared = await runSharedPasswordLogin(request, email, password);

    if (shared.kind === "failure") {
      return NextResponse.json(shared.body, { status: shared.status });
    }

    if (shared.kind === "two_factor") {
      return NextResponse.json(shared.body, { status: shared.status });
    }

    const response = NextResponse.json(
      {
        success: true,
        user: shared.user,
        accessToken: shared.accessToken,
        refreshToken: shared.refreshToken,
        message: "Conectat cu succes",
      },
      { status: 200 }
    );

    const origin = request.headers.get("origin");
    const strictCors = getFlag("enterprise_security_hardening");
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
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Vary", "Origin");
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ mobile-login error:", message);
    return NextResponse.json(
      {
        error: "Eroare la autentificare",
        ...(process.env.NODE_ENV === "development" && { debug: message }),
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
