export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSecureRequest } from "@/lib/security/middleware";
import {
  auditEmailVerified,
  consumeEmailVerificationToken,
  genericVerifyFailureMessage,
  lazyCleanupEmailVerificationTokens,
  VerifyEmailError,
} from "@/lib/auth/email-verification";
import { logger } from "@/lib/logger";

const verifyEmailSchema = z
  .object({
    token: z.string().min(32).max(128),
  })
  .strict();

/**
 * Email verification — consumes a single-use hashed token.
 * GET is intentionally not supported for consumption (email scanners).
 */
export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: "email_verification",
      schema: verifyEmailSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : 400;
      return NextResponse.json(
        { error: security.rateLimitError ? security.error : genericVerifyFailureMessage() },
        { status }
      );
    }

    const { token } = security.data as { token: string };

    try {
      const result = await consumeEmailVerificationToken(token);
      await auditEmailVerified({
        userId: result.userId,
        alreadyVerified: result.alreadyVerified,
      });
      void lazyCleanupEmailVerificationTokens().catch(() => {});

      return NextResponse.json({
        success: true,
        alreadyVerified: result.alreadyVerified,
        message: result.alreadyVerified
          ? "Emailul era deja verificat."
          : "Email verificat cu succes.",
      });
    } catch (err) {
      if (err instanceof VerifyEmailError) {
        logger.info({ reason: err.reason }, "email_verify_rejected");
        return NextResponse.json(
          { error: genericVerifyFailureMessage() },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error) {
    logger.error({ error }, "email_verify_error");
    return NextResponse.json(
      { error: genericVerifyFailureMessage() },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Folosește pagina de verificare sau POST /api/auth/verify-email cu token.",
    },
    { status: 405 }
  );
}
