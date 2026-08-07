export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, issueAuthTokenPair } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { mobileRegisterSchema } from "@/lib/security/validation-schemas";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  EMAIL_VERIFY_PURPOSE,
  issueAndDispatchEmailVerification,
} from "@/lib/auth/email-verification";

/**
 * POST /api/auth/mobile-register
 * Personal registration for the mobile app (Bearer tokens in JSON, no CSRF).
 * Schema matches apps/mobile payload: { name, email, password }.
 * Privileges (role/admin/verified) are server-controlled; client cannot set them.
 */
export async function POST(request: NextRequest) {
  try {
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "register",
      schema: mobileRegisterSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { email, password, name } = security.data as {
      email: string;
      password: string;
      name: string;
    };

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json({ error: "Email invalid" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "Nu am putut crea contul. Verifică datele sau încearcă din nou mai târziu.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    let user;
    try {
      user = await db.user.create({
        data: {
          email: sanitizedEmail,
          password: hashedPassword,
          name: name || null,
          role: "user",
          trustScore: 50,
          emailVerified: false,
          phoneVerified: false,
          isBanned: false,
        },
      });
    } catch (createErr: unknown) {
      const code = (createErr as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json(
          {
            error:
              "Nu am putut crea contul. Verifică datele sau încearcă din nou mai târziu.",
          },
          { status: 400 }
        );
      }
      throw createErr;
    }

    const { accessToken, refreshToken } = await issueAuthTokenPair(user);

    try {
      await auditActions.userCreated(
        { userId: user.id, email: user.email, role: user.role } as any,
        user
      );
    } catch (auditError) {
      console.warn("Audit log failed:", auditError);
    }

    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.USER_REGISTERED,
      severity: AdminNotificationSeverity.info,
      title: "Utilizator nou înregistrat",
      message: `${user.email} a creat un cont (mobil).`,
      entityType: "user",
      entityId: user.id,
    });

    let emailDispatchAccepted = false;
    try {
      const dispatched = await issueAndDispatchEmailVerification({
        userId: user.id,
        email: user.email,
        purpose: EMAIL_VERIFY_PURPOSE,
      });
      emailDispatchAccepted = dispatched.accepted;
    } catch (verifyErr) {
      console.warn("email verification issue failed after mobile-register:", verifyErr);
    }

    const { password: _password, ...userWithoutPassword } = user;
    void _password;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        emailDispatchAccepted,
        message: emailDispatchAccepted
          ? "Cont creat cu succes! Verifică-ți emailul pentru confirmare."
          : "Cont creat cu succes! Poți solicita mai târziu un email de verificare.",
        mode: db.isUsingInMemory() ? "development" : "production",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Mobile register error:", error);

    return NextResponse.json(
      {
        error: "Eroare la crearea contului. Vă rugăm încercați din nou.",
        success: false,
      },
      { status: 500 }
    );
  }
}
