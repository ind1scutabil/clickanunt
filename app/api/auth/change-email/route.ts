export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getUserFromRequest, issueAuthTokenPair } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { sanitizeEmail } from "@/lib/sanitize";
import { passwordSchema } from "@/lib/security/validation-schemas";
import { bumpSessionVersion } from "@/lib/auth/session-version";
import { createAuditLog } from "@/lib/audit";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";
import {
  EMAIL_CHANGE_PURPOSE,
  issueAndDispatchEmailVerification,
  normalizeEmail,
  notifyPreviousEmailOfChange,
} from "@/lib/auth/email-verification";
import { logger } from "@/lib/logger";

/**
 * Immediate email change (schema has no pendingEmail).
 * New email becomes unverified; verification token sent to the new address.
 * Requires current password. Bumps sessionVersion and re-issues cookies for this device.
 */
const changeEmailSchema = z
  .object({
    newEmail: z.string().email().max(255),
    currentPassword: passwordSchema,
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "email_verification",
      schema: changeEmailSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { newEmail, currentPassword } = security.data as {
      newEmail: string;
      currentPassword: string;
    };

    const sanitized = sanitizeEmail(newEmail);
    if (!sanitized) {
      return NextResponse.json({ error: "Email invalid" }, { status: 400 });
    }
    const normalizedNew = normalizeEmail(sanitized);

    const dbUser = await prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isBanned: true,
      },
    });

    if (!dbUser || dbUser.isBanned) {
      return NextResponse.json({ error: "Utilizator ineligibil" }, { status: 403 });
    }

    const previousEmail = normalizeEmail(dbUser.email);
    if (previousEmail === normalizedNew) {
      return NextResponse.json(
        { error: "Noul email este identic cu cel actual" },
        { status: 400 }
      );
    }

    const passwordOk = await bcrypt.compare(currentPassword, dbUser.password);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "Parola actuală este incorectă" },
        { status: 401 }
      );
    }

    const conflict = await prisma.user.findFirst({
      where: {
        email: normalizedNew,
        deletedAt: null,
        NOT: { id: dbUser.id },
      },
      select: { id: true },
    });

    // Anti-enumeration-ish: do not say "already taken" vs other failures for strangers,
    // but authenticated owner needs a clear conflict signal.
    if (conflict) {
      return NextResponse.json(
        { error: "Nu putem folosi această adresă. Alege alt email." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: dbUser.id },
        data: {
          email: normalizedNew,
          emailVerified: false,
        },
      });
      await tx.authEmailVerificationToken.updateMany({
        where: {
          userId: dbUser.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    const newSv = await bumpSessionVersion(dbUser.id);

    const dispatched = await issueAndDispatchEmailVerification({
      userId: dbUser.id,
      email: normalizedNew,
      purpose: EMAIL_CHANGE_PURPOSE,
    });

    // Also allow verify purpose tokens to work the same consume path
    if (!dispatched.accepted) {
      // Retry as email_verify purpose if change dispatch failed oddly — already issued change purpose
    }

    void notifyPreviousEmailOfChange({
      previousEmail,
      userId: dbUser.id,
    });

    await createAuditLog({
      userId: dbUser.id,
      action: "user.email_changed",
      resource: "user",
      resourceId: dbUser.id,
      details: {
        sessionVersion: newSv,
        emailDispatchAccepted: dispatched.accepted,
        // No raw emails in audit — hashes only would be ideal; omit PII
      },
    });

    const { accessToken, refreshToken } = await issueAuthTokenPair({
      id: dbUser.id,
      email: normalizedNew,
      role: dbUser.role,
      sessionVersion: newSv,
    });

    const response = NextResponse.json({
      success: true,
      emailVerified: false,
      emailDispatchAccepted: dispatched.accepted,
      message: dispatched.accepted
        ? "Email actualizat. Verifică noul inbox pentru linkul de confirmare. Celelalte dispozitive au fost deconectate."
        : "Email actualizat, dar trimiterea confirmării a eșuat temporar. Folosește „Retrimite verificare”. Celelalte dispozitive au fost deconectate.",
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
    logger.error({ error }, "change_email_error");
    return NextResponse.json(
      { error: "Eroare la schimbarea emailului" },
      { status: 500 }
    );
  }
}
