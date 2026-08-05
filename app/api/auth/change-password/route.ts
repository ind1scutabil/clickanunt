export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { validateSecureRequest } from "@/lib/security/middleware";
import { changePasswordSchema } from "@/lib/security/validation-schemas";
import { bumpSessionVersion } from "@/lib/auth/session-version";
import { createAuditLog } from "@/lib/audit";
import { issueAuthTokenPair } from "@/lib/auth";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";

export async function POST(request: NextRequest) {
  try {
    // Verifică autentificare
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: changePasswordSchema,
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

    const { currentPassword, newPassword } = security.data as {
      currentPassword: string;
      newPassword: string;
    };

    // Get user din DB
    const dbUser = await db.findUserById(user.id);

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilizator nu găsit" },
        { status: 404 }
      );
    }

    // Verifică parola actuală
    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Parola actuală este incorectă" },
        { status: 401 }
      );
    }

    // Hash parola nouă
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizează parola + revocă toate sesiunile JWT existente
    await db.updateUser(user.id, { password: newHash });
    const newSv = await bumpSessionVersion(user.id);

    await createAuditLog({
      userId: user.id,
      action: "user.password_changed",
      resource: "user",
      resourceId: user.id,
      details: { sessionVersion: newSv },
    });

    // Emit sesiune nouă pe dispozitivul curent; celelalte dispozitive rămân invalide.
    const { accessToken, refreshToken } = await issueAuthTokenPair({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      sessionVersion: newSv,
    });

    const response = NextResponse.json({
      success: true,
      message: "Parola schimbată cu succes. Celelalte dispozitive au fost deconectate.",
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
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: "Eroare la schimbare" },
      { status: 500 }
    );
  }
}
