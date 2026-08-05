/**
 * Persistent refresh-token rotation (hash-only).
 * Raw JWT is never stored. Replay of a used/revoked hash revokes the token family.
 */
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Keep used/revoked rows for replay detection (days). */
export const REFRESH_REPLAY_RETENTION_DAYS = 30;

export type RefreshRotateFailureReason =
  | "invalid"
  | "replay"
  | "expired"
  | "missing_record"
  | "revoked";

export class RefreshRotateError extends Error {
  constructor(
    public readonly reason: RefreshRotateFailureReason,
    public readonly familyId?: string
  ) {
    super(`refresh_rotate_${reason}`);
    this.name = "RefreshRotateError";
  }
}

export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function refreshExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_MS);
}

export async function persistIssuedRefreshToken(opts: {
  userId: string;
  rawToken: string;
  familyId?: string;
  expiresAt?: Date;
}): Promise<{ familyId: string; recordId: string }> {
  const familyId = opts.familyId || randomUUID();
  const tokenHash = hashRefreshToken(opts.rawToken);
  const record = await prisma.authRefreshToken.create({
    data: {
      userId: opts.userId,
      familyId,
      tokenHash,
      expiresAt: opts.expiresAt ?? refreshExpiresAt(),
    },
    select: { id: true, familyId: true },
  });
  return { familyId: record.familyId, recordId: record.id };
}

export async function revokeRefreshFamily(
  familyId: string,
  reason: string
): Promise<number> {
  const result = await prisma.authRefreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}

export async function revokeAllRefreshTokensForUser(
  userId: string,
  reason: string
): Promise<number> {
  const result = await prisma.authRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}

export async function revokeRefreshTokenByRaw(
  rawToken: string | null | undefined,
  reason: string
): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashRefreshToken(rawToken);
  const row = await prisma.authRefreshToken.findUnique({
    where: { tokenHash },
    select: { familyId: true, revokedAt: true },
  });
  if (!row) return false;
  if (row.revokedAt) return true;
  await revokeRefreshFamily(row.familyId, reason);
  return true;
}

/**
 * Atomically consume current refresh hash and insert the replacement.
 * Concurrent callers: at most one succeeds; loser is conflict or replay.
 * Family revoke on replay is committed (not rolled back by thrown errors).
 */
export async function rotateRefreshTokenRecord(opts: {
  userId: string;
  presentedRawToken: string;
  nextRawToken: string;
}): Promise<{ familyId: string; newRecordId: string }> {
  const presentedHash = hashRefreshToken(opts.presentedRawToken);
  const nextHash = hashRefreshToken(opts.nextRawToken);
  const now = new Date();

  const existing = await prisma.authRefreshToken.findUnique({
    where: { tokenHash: presentedHash },
  });

  if (!existing) {
    throw new RefreshRotateError("missing_record");
  }
  if (existing.userId !== opts.userId) {
    throw new RefreshRotateError("invalid");
  }
  if (existing.revokedAt) {
    throw new RefreshRotateError("revoked", existing.familyId);
  }
  if (existing.expiresAt.getTime() <= now.getTime()) {
    await prisma.authRefreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: now, revokeReason: "expired" },
    });
    throw new RefreshRotateError("expired", existing.familyId);
  }
  if (existing.usedAt) {
    await revokeRefreshFamily(existing.familyId, "replay");
    throw new RefreshRotateError("replay", existing.familyId);
  }

  type TxResult =
    | { type: "ok"; familyId: string; newRecordId: string }
    | { type: "conflict"; familyId: string }
    | { type: "replay"; familyId: string };

  const txResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    const claimed = await tx.authRefreshToken.updateMany({
      where: {
        id: existing.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      const again = await tx.authRefreshToken.findUnique({
        where: { tokenHash: presentedHash },
      });
      if (again?.usedAt && again.replacedById) {
        return { type: "conflict", familyId: existing.familyId };
      }
      return { type: "replay", familyId: existing.familyId };
    }

    const created = await tx.authRefreshToken.create({
      data: {
        userId: opts.userId,
        familyId: existing.familyId,
        tokenHash: nextHash,
        expiresAt: refreshExpiresAt(now),
      },
      select: { id: true, familyId: true },
    });

    await tx.authRefreshToken.update({
      where: { id: existing.id },
      data: { replacedById: created.id },
    });

    return {
      type: "ok",
      familyId: created.familyId,
      newRecordId: created.id,
    };
  });

  if (txResult.type === "ok") {
    return {
      familyId: txResult.familyId,
      newRecordId: txResult.newRecordId,
    };
  }
  if (txResult.type === "conflict") {
    throw new RefreshRotateError("invalid", txResult.familyId);
  }
  await revokeRefreshFamily(txResult.familyId, "replay_concurrent");
  throw new RefreshRotateError("replay", txResult.familyId);
}

export async function auditRefreshReplay(userId: string, familyId: string): Promise<void> {
  try {
    await createAuditLog({
      userId,
      action: "auth.refresh_replay",
      resource: "auth_refresh_token",
      resourceId: familyId,
      details: { familyIdPrefix: familyId.slice(0, 8) },
    });
  } catch {
    /* ignore audit failures */
  }
}

/** Lazy cleanup: remove very old used/revoked/expired rows (limited batch). */
export async function lazyCleanupRefreshTokens(limit = 50): Promise<number> {
  const cutoff = new Date(
    Date.now() - REFRESH_REPLAY_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const old = await prisma.authRefreshToken.findMany({
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
  const result = await prisma.authRefreshToken.deleteMany({
    where: { id: { in: old.map((r) => r.id) } },
  });
  return result.count;
}
