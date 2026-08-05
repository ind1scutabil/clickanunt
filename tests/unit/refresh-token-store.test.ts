/** @jest-environment node */
/**
 * Refresh rotation + replay detection (hash store).
 */
import { createHash, randomUUID } from "crypto";

const mockTx = {
  authRefreshToken: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    authRefreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import {
  hashRefreshToken,
  rotateRefreshTokenRecord,
  persistIssuedRefreshToken,
} from "@/lib/auth/refresh-token-store";
import { prisma } from "@/lib/prisma";

describe("refresh-token-store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hashes refresh tokens with sha256 hex", () => {
    const h = hashRefreshToken("abc");
    expect(h).toBe(createHash("sha256").update("abc", "utf8").digest("hex"));
    expect(h).toHaveLength(64);
  });

  it("persists issued refresh without storing raw token", async () => {
    (prisma.authRefreshToken.create as jest.Mock).mockResolvedValue({
      id: "r1",
      familyId: "f1",
    });
    const out = await persistIssuedRefreshToken({
      userId: "u1",
      rawToken: "raw-jwt",
      familyId: "f1",
    });
    expect(out.familyId).toBe("f1");
    const arg = (prisma.authRefreshToken.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.tokenHash).toBe(hashRefreshToken("raw-jwt"));
    expect(JSON.stringify(arg)).not.toContain("raw-jwt");
  });

  it("rotates atomically when unused", async () => {
    const familyId = randomUUID();
    (prisma.authRefreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: "old",
      userId: "u1",
      familyId,
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockTx.authRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    mockTx.authRefreshToken.create.mockResolvedValue({
      id: "new",
      familyId,
    });
    mockTx.authRefreshToken.update.mockResolvedValue({});

    const result = await rotateRefreshTokenRecord({
      userId: "u1",
      presentedRawToken: "old-raw",
      nextRawToken: "new-raw",
    });
    expect(result.familyId).toBe(familyId);
    expect(result.newRecordId).toBe("new");
    expect(mockTx.authRefreshToken.create.mock.calls[0][0].data.tokenHash).toBe(
      hashRefreshToken("new-raw")
    );
  });

  it("detects replay of used token and revokes family (committed)", async () => {
    const familyId = "fam-replay";
    (prisma.authRefreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: "old",
      userId: "u1",
      familyId,
      usedAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    (prisma.authRefreshToken.updateMany as jest.Mock).mockResolvedValue({
      count: 2,
    });

    await expect(
      rotateRefreshTokenRecord({
        userId: "u1",
        presentedRawToken: "old-raw",
        nextRawToken: "new-raw",
      })
    ).rejects.toMatchObject({ reason: "replay", familyId });

    expect(prisma.authRefreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId, revokedAt: null },
        data: expect.objectContaining({ revokeReason: "replay" }),
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("treats lost concurrent claim as soft conflict when winner already replaced", async () => {
    const familyId = "fam-race";
    (prisma.authRefreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: "old",
      userId: "u1",
      familyId,
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockTx.authRefreshToken.updateMany.mockResolvedValue({ count: 0 });
    mockTx.authRefreshToken.findUnique.mockResolvedValue({
      id: "old",
      userId: "u1",
      familyId,
      usedAt: new Date(),
      revokedAt: null,
      replacedById: "new",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      rotateRefreshTokenRecord({
        userId: "u1",
        presentedRawToken: "old-raw",
        nextRawToken: "new-raw",
      })
    ).rejects.toMatchObject({ reason: "invalid" });
  });

  it("rejects missing_record (legacy strategy A)", async () => {
    (prisma.authRefreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      rotateRefreshTokenRecord({
        userId: "u1",
        presentedRawToken: "legacy",
        nextRawToken: "new",
      })
    ).rejects.toMatchObject({ reason: "missing_record" });
  });
});
