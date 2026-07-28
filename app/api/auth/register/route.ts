/**
 * API Route: Register nou user - Enterprise Level
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, issueAuthTokenPair } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { registerSchema } from "@/lib/security/validation-schemas";
import { cookieDomainFromRequest, cookieSecureFromRequest } from "@/lib/cookie-domain";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  EMAIL_VERIFY_PURPOSE,
  issueAndDispatchEmailVerification,
} from "@/lib/auth/email-verification";

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'register',
      schema: registerSchema,
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

    const { email, password, name } = security.data as {
      email: string;
      password: string;
      name: string;
    };

    // Sanitizare email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }

    // Verifică dacă email-ul există deja
    const existingUser = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      // Anti-enumeration: do not confirm that the email is registered.
      return NextResponse.json(
        {
          error:
            "Nu am putut crea contul. Verifică datele sau încearcă din nou mai târziu.",
        },
        { status: 400 }
      );
    }

    // Hash parolă
    const hashedPassword = await hashPassword(password);

    // Creează user
    const user = await db.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: name || null,
        role: 'user', // Default role
        trustScore: 50,
        emailVerified: false,
        phoneVerified: false,
        isBanned: false,
      },
    });

    // Generează tokens + persistă refresh hash
    const { accessToken, refreshToken } = await issueAuthTokenPair(user);

    // Audit log (skip if in-memory mode)
    try {
      await auditActions.userCreated(
        { userId: user.id, email: user.email, role: user.role } as any,
        user
      );
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.USER_REGISTERED,
      severity: AdminNotificationSeverity.info,
      title: "Utilizator nou înregistrat",
      message: `${user.email} a creat un cont.`,
      entityType: "user",
      entityId: user.id,
    });

    // Email verification (non-blocking for registration success)
    let emailDispatchAccepted = false;
    try {
      const dispatched = await issueAndDispatchEmailVerification({
        userId: user.id,
        email: user.email,
        purpose: EMAIL_VERIFY_PURPOSE,
      });
      emailDispatchAccepted = dispatched.accepted;
    } catch (verifyErr) {
      console.warn("email verification issue failed after register:", verifyErr);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Set cookies pentru autentificare automată
    const response = NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        emailDispatchAccepted,
        message: emailDispatchAccepted
          ? "Cont creat cu succes! Verifică-ți emailul pentru confirmare."
          : "Cont creat cu succes! Poți solicita mai târziu un email de verificare.",
        mode: db.isUsingInMemory() ? 'development' : 'production',
      },
      { status: 200 }
    );

    const cookieDomain = cookieDomainFromRequest(request);
    const secureCookies = cookieSecureFromRequest(request);

    // Set access token cookie (7 zile) - Safari compatible
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      /** lax — la fel ca login: strict blochează cookie-uri la unele navigări cross-site + fetch credentialed */
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 zile
      path: '/',
      priority: 'high',
    });

    // Set refresh token cookie (30 zile)
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      domain: cookieDomain,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 zile
      path: '/',
      priority: 'high',
    });

    // Add CORS headers
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  } catch (error: any) {
    console.error('❌ Register error:', error);
    
    // Detailed error response pentru development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Eroare: ${error.message}` 
      : 'Eroare la crearea contului. Vă rugăm încercați din nou.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        ...(process.env.NODE_ENV === 'development' && { debug: error.stack })
      },
      { status: 500 }
    );
  }
}
