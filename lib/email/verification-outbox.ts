/**
 * In-memory verification email outbox for tests / local capture.
 * Raw tokens are held only in process memory when capture is enabled — never in DB/logs.
 */
export type VerificationEmailTemplateId =
  | "email_verification"
  | "email_change"
  | "email_changed_notice";

export type VerificationOutboxEntry = {
  id: string;
  templateId: VerificationEmailTemplateId;
  toRedacted: string;
  userId: string;
  /** Present only when outbox capture is enabled (test / EMAIL_OUTBOX=1). */
  rawToken?: string;
  createdAt: number;
};

const outbox: VerificationOutboxEntry[] = [];

export function isVerificationOutboxEnabled(): boolean {
  if (process.env.EMAIL_OUTBOX === "1" || process.env.EMAIL_OUTBOX === "true") {
    return true;
  }
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  // Jest / Vitest often set JEST_WORKER_ID
  if (process.env.JEST_WORKER_ID !== undefined) {
    return true;
  }
  return false;
}

export function captureVerificationOutbox(entry: {
  templateId: VerificationEmailTemplateId;
  toRedacted: string;
  userId: string;
  rawToken?: string;
}): void {
  if (!isVerificationOutboxEnabled()) {
    return;
  }
  outbox.push({
    id: `outbox-${Date.now()}-${outbox.length}`,
    templateId: entry.templateId,
    toRedacted: entry.toRedacted,
    userId: entry.userId,
    rawToken: entry.rawToken,
    createdAt: Date.now(),
  });
}

export function peekVerificationOutbox(): readonly VerificationOutboxEntry[] {
  return outbox;
}

export function drainVerificationOutbox(): VerificationOutboxEntry[] {
  return outbox.splice(0, outbox.length);
}

export function clearVerificationOutbox(): void {
  outbox.length = 0;
}

export function latestVerificationTokenForUser(
  userId: string
): string | undefined {
  for (let i = outbox.length - 1; i >= 0; i -= 1) {
    const e = outbox[i];
    if (e.userId === userId && e.rawToken) {
      return e.rawToken;
    }
  }
  return undefined;
}
