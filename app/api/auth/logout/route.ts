/**
 * API Route: Logout
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { clearAuthCookies } from "@/lib/auth/clear-auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const user = await getUserFromRequest(request);

    if (user) {
      await auditActions.userLogout(user.id, user.email);
    }

    const response = NextResponse.json({
      success: true,
      message: "Deconectat cu succes",
    });

    clearAuthCookies(response, request);

    return response;
  } catch {
    return NextResponse.json({ error: "Eroare la logout" }, { status: 500 });
  }
}
