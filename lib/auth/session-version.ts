/**
 * Session revocation via User.sessionVersion (claim `sv` in JWT).
 * Expand-only field; missing claim treated as 0 (legacy tokens).
 */
import { prisma } from "@/lib/prisma";

export function sessionVersionFromUser(user: {
  sessionVersion?: number | null;
} | null | undefined): number {
  const v = user?.sessionVersion;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

export function sessionVersionFromTokenPayload(payload: {
  sv?: unknown;
}): number {
  if (typeof payload.sv === "number" && Number.isFinite(payload.sv) && payload.sv >= 0) {
    return Math.floor(payload.sv);
  }
  if (typeof payload.sv === "string" && /^\d+$/.test(payload.sv)) {
    return parseInt(payload.sv, 10);
  }
  // Legacy JWTs without `sv` behave as version 0.
  return 0;
}

export function isSessionVersionMatch(
  tokenSv: number,
  userSv: number
): boolean {
  return tokenSv === userSv;
}

/**
 * Atomically increment sessionVersion — invalidates all outstanding JWTs.
 * Returns the new version.
 */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}
