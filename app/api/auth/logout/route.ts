/**
 * API Route: Logout
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { logoutBodySchema } from "@/lib/security/validation-schemas";
import { clearAuthCookies } from "@/lib/auth/clear-auth-cookies";
import { revokeRefreshTokenByRaw } from "@/lib/auth/refresh-token-store";

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
    const presentedRefresh = request.cookies.get("refreshToken")?.value;

    // Optional JSON body — web logout sends no body; mobile may send { refreshToken }.
    let bodyRefresh: string | undefined;
    try {
      const text = await request.text();
      if (text.trim()) {
        const parsed = logoutBodySchema.safeParse(JSON.parse(text));
        if (parsed.success && typeof parsed.data.refreshToken === "string") {
          bodyRefresh = parsed.data.refreshToken;
        }
      }
    } catch {
      /* empty / non-JSON body is valid for cookie-only logout */
    }

    if (presentedRefresh) {
      await revokeRefreshTokenByRaw(presentedRefresh, "logout");
    }
    if (bodyRefresh && bodyRefresh !== presentedRefresh) {
      await revokeRefreshTokenByRaw(bodyRefresh, "logout");
    }

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
