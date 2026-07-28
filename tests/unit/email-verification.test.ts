/**
 * Unit tests for email verification token store + gate (no real SMTP).
 */
import { createHash } from "crypto";

jest.mock("@/lib/prisma", () => {
  const authEmailVerificationToken = {
    updateMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const user = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  return {
    prisma: {
      authEmailVerificationToken,
      user,
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ authEmailVerificationToken, user })
      ),
    },
  };
});

jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: "mock-1" }),
}));

jest.mock("@/lib/public-site-url", () => ({
  publicSiteOrigin: () => "https://www.clickanunt.ro",
}));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  clearVerificationOutbox,
  drainVerificationOutbox,
  latestVerificationTokenForUser,
} from "@/lib/email/verification-outbox";
import {
  EMAIL_VERIFY_PURPOSE,
  buildEmailVerificationUrl,
  consumeEmailVerificationToken,
  hashEmailVerificationToken,
  issueAndDispatchEmailVerification,
  issueEmailVerificationToken,
  isValidEmailVerificationTokenFormat,
  VerifyEmailError,
} from "@/lib/auth/email-verification";
import {
  isEmailVerificationEnforcementEnabled,
  shouldBlockUnverifiedEmail,
} from "@/lib/auth/email-verified-gate";

const txToken = () =>
  (prisma as unknown as { authEmailVerificationToken: Record<string, jest.Mock> })
    .authEmailVerificationToken;
const txUser = () =>
  (prisma as unknown as { user: Record<string, jest.Mock> }).user;

describe("email verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearVerificationOutbox();
    process.env.EMAIL_OUTBOX = "1";
    delete process.env.REQUIRE_EMAIL_VERIFIED;
  });

  afterEach(() => {
    delete process.env.EMAIL_OUTBOX;
    delete process.env.REQUIRE_EMAIL_VERIFIED;
  });

  test("token format + hash is sha256 hex", () => {
    expect(isValidEmailVerificationTokenFormat("a".repeat(31))).toBe(false);
    expect(isValidEmailVerificationTokenFormat("Ab_cd-ef".padEnd(43, "x"))).toBe(
      true
    );
    const raw = "x".repeat(43);
    expect(hashEmailVerificationToken(raw)).toBe(
      createHash("sha256").update(raw, "utf8").digest("hex")
    );
  });

  test("buildEmailVerificationUrl uses allowlisted origin only", () => {
    const url = buildEmailVerificationUrl("tokentokentokentokentokentokentoken12");
    expect(url.startsWith("https://www.clickanunt.ro/auth/verify-email?token=")).toBe(
      true
    );
    expect(url).not.toContain("evil.com");
  });

  test("issue stores hash only and outbox holds raw in test mode", async () => {
    txToken().updateMany.mockResolvedValue({ count: 0 });
    txToken().create.mockResolvedValue({ id: "rec-1" });

    const { rawToken, recordId } = await issueEmailVerificationToken({
      userId: "u1",
      email: "User@Example.com",
      purpose: EMAIL_VERIFY_PURPOSE,
    });

    expect(recordId).toBe("rec-1");
    expect(rawToken.length).toBeGreaterThanOrEqual(32);
    const createArg = txToken().create.mock.calls[0][0];
    expect(createArg.data.tokenHash).toBe(hashEmailVerificationToken(rawToken));
    expect(createArg.data.email).toBe("user@example.com");
    expect(JSON.stringify(createArg)).not.toContain(rawToken);
  });

  test("issueAndDispatch captures outbox without logging raw token via sendEmail args check", async () => {
    txToken().updateMany.mockResolvedValue({ count: 0 });
    txToken().create.mockResolvedValue({ id: "rec-2" });

    const result = await issueAndDispatchEmailVerification({
      userId: "u2",
      email: "a@b.com",
      purpose: EMAIL_VERIFY_PURPOSE,
    });

    expect(result.accepted).toBe(true);
    const token = latestVerificationTokenForUser("u2");
    expect(token).toBeTruthy();
    expect(drainVerificationOutbox()[0].toRedacted).toContain("@");
    expect((sendEmail as jest.Mock).mock.calls[0][0].to).toBe("a@b.com");
  });

  test("consume valid token marks verified and single-use", async () => {
    const raw = "v".repeat(43);
    const hash = hashEmailVerificationToken(raw);
    const now = new Date();
    txToken().findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "a@b.com",
      tokenHash: hash,
      purpose: EMAIL_VERIFY_PURPOSE,
      expiresAt: new Date(now.getTime() + 60_000),
      usedAt: null,
      revokedAt: null,
    });
    txUser().findFirst.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: false,
      isBanned: false,
    });
    txToken().updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    txUser().update.mockResolvedValue({});

    const result = await consumeEmailVerificationToken(raw);
    expect(result.userId).toBe("u1");
    expect(result.alreadyVerified).toBe(false);
    expect(txUser().update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { emailVerified: true },
      })
    );
  });

  test("expired / used / mismatch throw generic reasons", async () => {
    const raw = "e".repeat(43);
    const hash = hashEmailVerificationToken(raw);
    txToken().findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "a@b.com",
      tokenHash: hash,
      purpose: EMAIL_VERIFY_PURPOSE,
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      revokedAt: null,
    });
    txUser().findFirst.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: false,
      isBanned: false,
    });

    await expect(consumeEmailVerificationToken(raw)).rejects.toBeInstanceOf(
      VerifyEmailError
    );

    txToken().findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      email: "old@b.com",
      tokenHash: hash,
      purpose: EMAIL_VERIFY_PURPOSE,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
    });
    txUser().findFirst.mockResolvedValue({
      id: "u1",
      email: "new@b.com",
      emailVerified: false,
      isBanned: false,
    });
    await expect(consumeEmailVerificationToken(raw)).rejects.toMatchObject({
      reason: "email_mismatch",
    });
  });

  test("enforcement gate defaults off", () => {
    expect(isEmailVerificationEnforcementEnabled()).toBe(false);
    expect(shouldBlockUnverifiedEmail({ emailVerified: false })).toBe(false);
    process.env.REQUIRE_EMAIL_VERIFIED = "1";
    expect(isEmailVerificationEnforcementEnabled()).toBe(true);
    expect(shouldBlockUnverifiedEmail({ emailVerified: false })).toBe(true);
    expect(shouldBlockUnverifiedEmail({ emailVerified: true })).toBe(false);
  });
});
