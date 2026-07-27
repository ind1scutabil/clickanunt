/**
 * POST /api/auth/logout-all — revoke all sessions (bump sessionVersion) + clear cookies.
 * Requires current password confirmation.
 */
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getUserFromRequest, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import { bumpSessionVersion } from "@/lib/auth/session-version";
import { createAuditLog } from "@/lib/audit";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";

const logoutAllSchema = z.object({
  currentPassword: z.string().min(1, "Parola este obligatorie"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: logoutAllSchema,
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { currentPassword } = security.data as { currentPassword: string };
    const dbUser = await db.findUserById(user.id);
    if (!dbUser?.password) {
      return NextResponse.json({ error: "Utilizator inexistent" }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, dbUser.password);
    if (!ok) {
      return NextResponse.json({ error: "Parola este incorectă" }, { status: 401 });
    }

    const newSv = await bumpSessionVersion(user.id);

    await createAuditLog({
      userId: user.id,
      action: "user.logout_all",
      resource: "user",
      resourceId: user.id,
      details: { sessionVersion: newSv },
    });

    // Keep current browser logged in with fresh cookies after global revoke.
    const accessToken = await generateAccessToken(
      dbUser.id,
      dbUser.email,
      dbUser.role,
      newSv
    );
    const refreshToken = await generateRefreshToken(
      dbUser.id,
      dbUser.email,
      dbUser.role,
      newSv
    );

    const response = NextResponse.json({
      success: true,
      message: "Toate celelalte sesiuni au fost deconectate.",
    });

    const cookieDomain = cookieDomainFromRequest(request);
    const secureCookies = cookieSecureFromRequest(request);
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Eroare la deconectare" }, { status: 500 });
  }
}
