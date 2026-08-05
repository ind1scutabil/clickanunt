/**
 * Secure email verification tokens (hash-only, single-use, purpose-scoped).
 * Raw tokens are returned only to the email/outbox adapter — never logged or stored.
 */
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { publicSiteOrigin } from "@/lib/public-site-url";
import { createAuditLog } from "@/lib/audit";
import {
  captureVerificationOutbox,
  type VerificationEmailTemplateId,
} from "@/lib/email/verification-outbox";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Keep used/revoked/expired rows for audit (days). */
export const EMAIL_VERIFICATION_RETENTION_DAYS = 30;

export const EMAIL_VERIFY_PURPOSE = "email_verify" as const;
export const EMAIL_CHANGE_PURPOSE = "email_change" as const;

export type EmailVerificationPurpose =
  | typeof EMAIL_VERIFY_PURPOSE
  | typeof EMAIL_CHANGE_PURPOSE;

export type VerifyEmailFailureReason =
  | "invalid_format"
  | "not_found"
  | "expired"
  | "used"
  | "revoked"
  | "wrong_purpose"
  | "user_ineligible"
  | "email_mismatch"
  | "conflict";

export class VerifyEmailError extends Error {
  constructor(public readonly reason: VerifyEmailFailureReason) {
    super(`verify_email_${reason}`);
    this.name = "VerifyEmailError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmailVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateRawEmailVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Accept base64url (~43) or legacy hex (64). Reject empty/oversized. */
export function isValidEmailVerificationTokenFormat(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  if (t.length < 32 || t.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(t);
}

export function emailVerificationExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + EMAIL_VERIFICATION_TTL_MS);
}

export function buildEmailVerificationUrl(rawToken: string): string {
  const origin = publicSiteOrigin();
  return `${origin}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}

function redactEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!domain) return "***";
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

export async function revokeActiveEmailVerificationTokens(opts: {
  userId: string;
  purpose?: EmailVerificationPurpose;
}): Promise<number> {
  const result = await prisma.authEmailVerificationToken.updateMany({
    where: {
      userId: opts.userId,
      usedAt: null,
      revokedAt: null,
      ...(opts.purpose ? { purpose: opts.purpose } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Create a new verification token (revokes prior active tokens for same user+purpose).
 * Returns raw token only for the caller to hand to the email adapter.
 */
export async function issueEmailVerificationToken(opts: {
  userId: string;
  email: string;
  purpose: EmailVerificationPurpose;
}): Promise<{ rawToken: string; expiresAt: Date; recordId: string }> {
  const email = normalizeEmail(opts.email);
  const rawToken = generateRawEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = emailVerificationExpiresAt();

  const record = await prisma.$transaction(async (tx) => {
    await tx.authEmailVerificationToken.updateMany({
      where: {
        userId: opts.userId,
        purpose: opts.purpose,
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return tx.authEmailVerificationToken.create({
      data: {
        userId: opts.userId,
        email,
        tokenHash,
        purpose: opts.purpose,
        expiresAt,
      },
      select: { id: true },
    });
  });

  return { rawToken, expiresAt, recordId: record.id };
}

function verificationEmailHtml(link: string, purpose: EmailVerificationPurpose): string {
  const heading =
    purpose === EMAIL_CHANGE_PURPOSE
      ? "Confirmă noul email"
      : "Verifică-ți adresa de email";
  const body =
    purpose === EMAIL_CHANGE_PURPOSE
      ? "Ai solicitat schimbarea adresei de email pe ClickAnunț. Confirmă noul email apăsând butonul de mai jos."
      : "Mulțumim că te-ai înregistrat pe ClickAnunț. Confirmă adresa de email apăsând butonul de mai jos.";
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5;color:#222">
  <h1>${heading}</h1>
  <p>${body}</p>
  <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;">Confirmă emailul</a></p>
  <p style="font-size:13px;color:#666">Linkul expiră în 24 de ore. Dacă nu ai solicitat asta, ignoră mesajul.</p>
  </body></html>`;
}

/**
 * Issue token + enqueue/send verification email.
 * Delivery failure does not mark email verified and does not fail registration.
 */
export async function issueAndDispatchEmailVerification(opts: {
  userId: string;
  email: string;
  purpose: EmailVerificationPurpose;
}): Promise<{ accepted: boolean; messageId?: string }> {
  const email = normalizeEmail(opts.email);
  const { rawToken } = await issueEmailVerificationToken({
    userId: opts.userId,
    email,
    purpose: opts.purpose,
  });

  const link = buildEmailVerificationUrl(rawToken);
  const templateId: VerificationEmailTemplateId =
    opts.purpose === EMAIL_CHANGE_PURPOSE
      ? "email_change"
      : "email_verification";

  captureVerificationOutbox({
    templateId,
    toRedacted: redactEmail(email),
    userId: opts.userId,
    rawToken,
  });

  try {
    const info = await sendEmail({
      to: email,
      subject:
        opts.purpose === EMAIL_CHANGE_PURPOSE
          ? "Confirmă noul email — ClickAnunț"
          : "Verifică-ți emailul — ClickAnunț",
      html: verificationEmailHtml(link, opts.purpose),
      text: `${opts.purpose === EMAIL_CHANGE_PURPOSE ? "Confirmă noul email" : "Verifică-ți emailul"}: ${link}\n\nLinkul expiră în 24 de ore.`,
    });
    logger.info(
      {
        userId: opts.userId,
        to: redactEmail(email),
        templateId,
        messageId: info?.messageId,
      },
      "email_verification_dispatched"
    );
    return { accepted: true, messageId: info?.messageId };
  } catch (err) {
    logger.error(
      {
        userId: opts.userId,
        to: redactEmail(email),
        templateId,
        error: err instanceof Error ? err.message : String(err),
      },
      "email_verification_dispatch_failed"
    );
    return { accepted: false };
  }
}

export async function notifyPreviousEmailOfChange(opts: {
  previousEmail: string;
  userId: string;
}): Promise<void> {
  const email = normalizeEmail(opts.previousEmail);
  captureVerificationOutbox({
    templateId: "email_changed_notice",
    toRedacted: redactEmail(email),
    userId: opts.userId,
  });
  try {
    await sendEmail({
      to: email,
      subject: "Adresa de email a contului a fost schimbată — ClickAnunț",
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif">
        <p>Adresa de email asociată contului tău ClickAnunț a fost schimbată.</p>
        <p>Dacă nu ai făcut tu această modificare, contactează suportul imediat.</p>
        <p>Acest mesaj nu conține linkuri de confirmare.</p>
      </body></html>`,
      text: "Adresa de email a contului ClickAnunț a fost schimbată. Dacă nu ai cerut asta, contactează suportul.",
    });
  } catch {
    /* non-blocking notice */
  }
}

/**
 * Consume a verification token transactionally.
 * Idempotent success when the matching user is already verified for the same email
 * and the token was already used for that purpose.
 */
export async function consumeEmailVerificationToken(
  rawToken: string
): Promise<{ userId: string; email: string; alreadyVerified: boolean }> {
  if (!isValidEmailVerificationTokenFormat(rawToken)) {
    throw new VerifyEmailError("invalid_format");
  }

  const tokenHash = hashEmailVerificationToken(rawToken.trim());
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const row = await tx.authEmailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!row) {
      throw new VerifyEmailError("not_found");
    }

    if (row.purpose !== EMAIL_VERIFY_PURPOSE && row.purpose !== EMAIL_CHANGE_PURPOSE) {
      throw new VerifyEmailError("wrong_purpose");
    }

    const user = await tx.user.findFirst({
      where: { id: row.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isBanned: true,
      },
    });

    if (!user || user.isBanned) {
      throw new VerifyEmailError("user_ineligible");
    }

    const targetEmail = normalizeEmail(row.email);
    const currentEmail = normalizeEmail(user.email);

    if (currentEmail !== targetEmail) {
      throw new VerifyEmailError("email_mismatch");
    }

    // Idempotent: already verified + token already consumed for this user/email.
    if (row.usedAt && user.emailVerified) {
      return {
        userId: user.id,
        email: currentEmail,
        alreadyVerified: true,
      };
    }

    if (row.revokedAt) {
      throw new VerifyEmailError("revoked");
    }

    if (row.usedAt) {
      throw new VerifyEmailError("used");
    }

    if (row.expiresAt.getTime() <= now.getTime()) {
      throw new VerifyEmailError("expired");
    }

    const marked = await tx.authEmailVerificationToken.updateMany({
      where: {
        id: row.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (marked.count !== 1) {
      throw new VerifyEmailError("conflict");
    }

    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    await tx.authEmailVerificationToken.updateMany({
      where: {
        userId: user.id,
        id: { not: row.id },
        usedAt: null,
        revokedAt: null,
        OR: [{ email: targetEmail }, { purpose: row.purpose }],
      },
      data: { revokedAt: now },
    });

    return {
      userId: user.id,
      email: currentEmail,
      alreadyVerified: user.emailVerified,
    };
  });
}

export async function auditEmailVerified(opts: {
  userId: string;
  alreadyVerified: boolean;
  purpose?: string;
}): Promise<void> {
  try {
    await createAuditLog({
      userId: opts.userId,
      action: opts.alreadyVerified
        ? "user.email_verify_idempotent"
        : "user.email_verified",
      resource: "user",
      resourceId: opts.userId,
      details: { purpose: opts.purpose ?? EMAIL_VERIFY_PURPOSE },
    });
  } catch {
    /* non-blocking */
  }
}

/** Lazy cleanup of old verification rows (no assumed cron). */
export async function lazyCleanupEmailVerificationTokens(
  limit = 200
): Promise<number> {
  const cutoff = new Date(
    Date.now() - EMAIL_VERIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const old = await prisma.authEmailVerificationToken.findMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        {
          AND: [
            { OR: [{ usedAt: { not: null } }, { revokedAt: { not: null } }] },
            { createdAt: { lt: cutoff } },
          ],
        },
      ],
    },
    select: { id: true },
    take: limit,
  });
  if (old.length === 0) return 0;
  const result = await prisma.authEmailVerificationToken.deleteMany({
    where: { id: { in: old.map((r) => r.id) } },
  });
  return result.count;
}

/** Safe generic client message — never leak reason details that enable enumeration. */
export function genericVerifyFailureMessage(): string {
  return "Linkul de verificare este invalid sau a expirat. Poți solicita unul nou.";
}

export function genericResendMessage(): string {
  return "Dacă adresa există și nu este verificată, vei primi un email cu instrucțiuni.";
}
