/**
 * Probe: register → outbox token → verify → resend anti-enum (local DB).
 * Does not print raw tokens. Does not touch :3000.
 *
 * Usage:
 *   EMAIL_OUTBOX=1 npx tsx scripts/probe-email-verification.ts
 */
import { randomBytes } from "crypto";
import {
  clearVerificationOutbox,
  latestVerificationTokenForUser,
} from "../lib/email/verification-outbox";
import {
  EMAIL_VERIFY_PURPOSE,
  consumeEmailVerificationToken,
  hashEmailVerificationToken,
  issueAndDispatchEmailVerification,
} from "../lib/auth/email-verification";
import { prisma } from "../lib/prisma";

async function main() {
  process.env.EMAIL_OUTBOX = "1";
  clearVerificationOutbox();

  const email = `verify-probe-${randomBytes(4).toString("hex")}@example.com`;
  const passwordHash =
    "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV"; // unused — we create via prisma

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      emailVerified: false,
      role: "user",
    },
    select: { id: true, email: true, emailVerified: true },
  });

  console.log("created_user", { id: user.id, emailVerified: user.emailVerified });

  const dispatched = await issueAndDispatchEmailVerification({
    userId: user.id,
    email: user.email,
    purpose: EMAIL_VERIFY_PURPOSE,
  });
  console.log("dispatch_accepted", dispatched.accepted);

  const raw = latestVerificationTokenForUser(user.id);
  if (!raw) {
    throw new Error("outbox_missing_token");
  }
  const hash = hashEmailVerificationToken(raw);
  const row = await prisma.authEmailVerificationToken.findUnique({
    where: { tokenHash: hash },
    select: { tokenHash: true, usedAt: true },
  });
  if (!row) throw new Error("db_missing_hash");
  // Ensure raw not stored as hash equality would fail if raw were stored plaintext of different length — check no column equals raw
  const leak = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int AS c FROM auth_email_verification_tokens WHERE "tokenHash" = $1`,
    raw
  );
  console.log("raw_absent_as_hash_row", leak[0]?.c === 0);

  const first = await consumeEmailVerificationToken(raw);
  console.log("verify_ok", { alreadyVerified: first.alreadyVerified });

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });
  console.log("emailVerified_after", after?.emailVerified === true);

  // Idempotent: same used token + already verified → success, not a fresh verify.
  const second = await consumeEmailVerificationToken(raw);
  console.log("replay_idempotent", {
    alreadyVerified: second.alreadyVerified === true,
  });

  // cleanup
  await prisma.authEmailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("cleanup_ok");
}

main()
  .catch((e) => {
    console.error("probe_failed", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
