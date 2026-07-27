export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshAccessToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";

const bodySchema = z
  .object({
    refreshToken: z.string().min(10),
  })
  .strict();

/**
 * POST /api/auth/mobile-refresh
 * Same token rotation semantics as POST /api/auth/refresh, without CSRF (Bearer-capable clients only).
 */
export async function POST(request: NextRequest) {
  try {
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "api",
      schema: bodySchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.validationError ? 400 : 400;
      return NextResponse.json({ error: security.error || "Invalid request" }, { status });
    }

    const { refreshToken } = security.data as z.infer<typeof bodySchema>;

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Eroare la refresh token", ...(process.env.NODE_ENV === "development" && { debug: message }) },
      { status: 500 }
    );
  }
}
