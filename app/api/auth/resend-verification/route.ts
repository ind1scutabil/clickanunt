export const runtime = "nodejs";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSecureRequest } from "@/lib/security/middleware";
import { getUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_VERIFY_PURPOSE,
  genericResendMessage,
  issueAndDispatchEmailVerification,
  normalizeEmail,
} from "@/lib/auth/email-verification";
import { resolveSecureRateLimit } from "@/lib/rate-limit-distributed";
import { logger } from "@/lib/logger";
import { sanitizeEmail } from "@/lib/sanitize";

const resendSchema = z
  .object({
    email: z.string().email().max(255).optional(),
  })
  .strict();

function emailRateKey(email: string): string {
  return createHash("sha256").update(normalizeEmail(email), "utf8").digest("hex").slice(0, 32);
}

/**
 * Anti-enumeration resend verification.
 * Same success shape for missing / verified / banned / deleted.
 */
export async function POST(request: NextRequest) {
  const generic = {
    success: true,
    message: genericResendMessage(),
  };

  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "email_verification",
      schema: resendSchema,
    });

    if (!security.success) {
      if (security.rateLimitError) {
        return NextResponse.json({ error: security.error }, { status: 429 });
      }
      // Validation failure still anti-enum for email shape when possible
      return NextResponse.json(generic);
    }

    const body = security.data as { email?: string };
    const authUser = await getUserFromRequest(request).catch(() => null);

    let targetEmail: string | null = null;
    if (authUser?.email) {
      targetEmail = normalizeEmail(authUser.email);
    } else if (body.email) {
      const sanitized = sanitizeEmail(body.email);
      targetEmail = sanitized ? normalizeEmail(sanitized) : null;
    }

    if (!targetEmail) {
      return NextResponse.json(generic);
    }

    // Per-email hash rate limit (in addition to IP preset)
    const emailLimit = await resolveSecureRateLimit(
      "email_verification",
      `email:${emailRateKey(targetEmail)}`,
      authUser?.id ?? null
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Prea multe încercări. Încearcă mai târziu." },
        { status: 429 }
      );
    }

    // Soft cooldown: if an active token was created < 60s ago, skip send but same response
    const user =
      (await db.findUserByEmail(targetEmail)) ||
      (authUser
        ? await prisma.user.findFirst({
            where: { id: authUser.id, deletedAt: null },
          })
        : null);

    if (
      !user ||
      user.isBanned ||
      ("deletedAt" in user && user.deletedAt) ||
      user.emailVerified
    ) {
      logger.info(
        { emailHash: emailRateKey(targetEmail), eligible: false },
        "email_verification_resend"
      );
      return NextResponse.json(generic);
    }

    const recent = await prisma.authEmailVerificationToken.findFirst({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFY_PURPOSE,
        usedAt: null,
        revokedAt: null,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
      select: { id: true },
    });

    if (recent) {
      return NextResponse.json(generic);
    }

    const dispatched = await issueAndDispatchEmailVerification({
      userId: user.id,
      email: normalizeEmail(user.email),
      purpose: EMAIL_VERIFY_PURPOSE,
    });

    logger.info(
      {
        userId: user.id,
        emailHash: emailRateKey(targetEmail),
        accepted: dispatched.accepted,
      },
      "email_verification_resend"
    );

    return NextResponse.json({
      ...generic,
      ...(dispatched.accepted
        ? {}
        : {
            deliveryPending: true,
            message:
              "Cererea a fost înregistrată. Dacă emailul nu ajunge, încearcă din nou mai târziu.",
          }),
    });
  } catch (error) {
    logger.error({ error }, "email_verification_resend_error");
    return NextResponse.json(generic);
  }
}
