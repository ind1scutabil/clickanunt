export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, issueAuthTokenPair } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { mobileRegisterExtendedSchema } from "@/lib/security/validation-schemas";
import { AccountType, AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";

interface RegisterRequest {
  email: string;
  password: string;
  accountType: "personal" | "business";
  name: string;
  businessName?: string;
  businessCUI?: string;
  businessRegCom?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLocation?: string;
  businessDescription?: string;
  businessWebsite?: string;
  businessCategory?: "auto_dealer" | "real_estate" | "retail" | "services" | "other";
}

const BUSINESS_ACTIVITY_LABEL: Record<string, string> = {
  auto_dealer: "Dealer auto",
  real_estate: "Agenție imobiliară",
  retail: "Magazin",
  services: "Servicii",
  other: "Altul",
};

function composeBusinessDescription(
  category: string | undefined,
  extra: string | undefined
): string | null {
  const head =
    category && BUSINESS_ACTIVITY_LABEL[category]
      ? `Tip activitate: ${BUSINESS_ACTIVITY_LABEL[category]}`
      : "";
  const tail = extra?.trim() ?? "";
  if (head && tail) return `${head}\n\n${tail}`;
  if (head) return head;
  if (tail) return tail;
  return null;
}

/**
 * POST /api/auth/mobile-register-extended
 * Personal/business registration for the mobile app (Bearer tokens, no CSRF).
 * accountType is allowlisted; role/privileges are always server-set to safe defaults.
 */
export async function POST(request: NextRequest) {
  try {
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "register",
      schema: mobileRegisterExtendedSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const {
      email,
      password,
      accountType,
      name,
      businessName,
      businessCUI,
      businessRegCom,
      businessPhone,
      businessEmail,
      businessLocation,
      businessDescription,
      businessWebsite,
      businessCategory,
    } = security.data as RegisterRequest;

    const prismaAccountType: AccountType =
      accountType === "business" ? AccountType.business : AccountType.private;

    const mergedBusinessDescription =
      accountType === "business"
        ? composeBusinessDescription(businessCategory, businessDescription)
        : undefined;

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
          name: name?.trim() || null,
          accountType: prismaAccountType,
          role: "user",
          trustScore: 50,
          emailVerified: false,
          phoneVerified: false,
          isBanned: false,

          ...(accountType === "business" && {
            businessName: businessName?.trim() || null,
            businessCUI: businessCUI?.trim().replace(/[^0-9]/g, "") || null,
            businessRegCom: businessRegCom?.trim() || null,
            businessPhone: businessPhone?.trim() || null,
            businessEmail: businessEmail?.trim() || sanitizedEmail,
            businessLocation: businessLocation?.trim() || null,
            businessDescription: mergedBusinessDescription ?? null,
            ...(businessWebsite?.trim()
              ? { businessWebsite: businessWebsite.trim() }
              : {}),
          }),

          subscriptionTier: "free",
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.USER_REGISTERED,
      severity: AdminNotificationSeverity.info,
      title: "Utilizator nou înregistrat",
      message: `${user.email} a creat un cont (${accountType}, mobil).`,
      entityType: "user",
      entityId: user.id,
      metadata: { accountType },
    });

    const { accessToken, refreshToken } = await issueAuthTokenPair(user);

    let emailDispatchAccepted = false;
    try {
      const { EMAIL_VERIFY_PURPOSE, issueAndDispatchEmailVerification } =
        await import("@/lib/auth/email-verification");
      const dispatched = await issueAndDispatchEmailVerification({
        userId: user.id,
        email: user.email,
        purpose: EMAIL_VERIFY_PURPOSE,
      });
      emailDispatchAccepted = dispatched.accepted;
    } catch (verifyErr) {
      console.warn(
        "email verification issue failed after mobile-register-extended:",
        verifyErr
      );
    }

    try {
      await auditActions.userCreated(
        { id: user.id, email: user.email, role: user.role },
        {
          ...user,
          accountType,
          ...(accountType === "business" && {
            businessName,
            businessCUI: businessCUI?.replace(/[^0-9]/g, ""),
          }),
        }
      );
    } catch (auditError) {
      console.warn("Audit log failed:", auditError);
    }

    const { password: passwordHash, ...userWithoutPassword } = user;
    void passwordHash;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accountType,
        emailDispatchAccepted,
        message: emailDispatchAccepted
          ? accountType === "business"
            ? "Cont business creat cu succes! Verifică-ți emailul pentru confirmare."
            : "Cont creat cu succes! Verifică-ți emailul pentru confirmare."
          : "Cont creat cu succes! Poți solicita mai târziu un email de verificare.",
        mode: db.isUsingInMemory() ? "development" : "production",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Mobile register extended error:", error);

    const err = error as { message?: string; code?: string };

    if (err.message?.includes("Connection timeout")) {
      return NextResponse.json(
        { error: "Server indisponibil temporar. Te rog încearcă din nou." },
        { status: 503 }
      );
    }

    if (err.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Nu am putut crea contul. Verifică datele sau încearcă din nou mai târziu.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Eroare la crearea contului. Te rog încearcă din nou.",
      },
      { status: 500 }
    );
  }
}
