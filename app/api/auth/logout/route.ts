/**
 * API Route: Logout
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";

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
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }
    // Obține user din token
    const user = await getUserFromRequest(request as any);

    if (user) {
      // Audit log
      await auditActions.userLogout(user.id, user.email);
    }

    // Crează response și șterge cookie-urile
    const response = NextResponse.json({
      success: true,
      message: "Deconectat cu succes",
    });

    // Șterge cookie-urile de autentificare
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la logout" },
      { status: 500 }
    );
  }
}
