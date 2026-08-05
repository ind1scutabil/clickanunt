import type { NextRequest } from "next/server";
import type { TokenPayload } from "@/lib/auth";
import { decodeAccessJwtPayload } from "@/lib/auth";
import { normalizeJwtInput } from "@/lib/jwt-normalize";
import { db } from "@/lib/db";
import {
  isSessionVersionMatch,
  sessionVersionFromTokenPayload,
  sessionVersionFromUser,
} from "@/lib/auth/session-version";

function uniqMessagingTokens(tokens: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const t = normalizeJwtInput(typeof raw === "string" ? raw : "");
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function bearerFromHeader(auth: string | null): string | null {
  const a = auth?.trim();
  if (!a) return null;
  const without = a.replace(/^Bearer\s+/i, "").trim();
  return without || null;
}

async function payloadIfActiveUser(
  payload: TokenPayload | null
): Promise<TokenPayload | null> {
  if (!payload?.userId) return null;
  const user = await db.findUserById(payload.userId);
  if (!user) return null;
  if (user.isBanned) return null;
  if ("deletedAt" in user && user.deletedAt) return null;
  const tokenSv = sessionVersionFromTokenPayload(payload);
  const userSv = sessionVersionFromUser(user);
  if (!isSessionVersionMatch(tokenSv, userSv)) return null;
  return payload;
}

/**
 * Auth SSE: cookie httpOnly first, then Bearer.
 * Query `?token=` is intentionally unsupported (JWT must not appear in URLs/logs).
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([cookieToken, headerToken])) {
    const payload = await decodeAccessJwtPayload(candidate);
    const active = await payloadIfActiveUser(payload);
    if (active?.userId) return active.userId;
  }
  return null;
}

/**
 * GET/POST JSON mesaje: cookie httpOnly înainte de Bearer.
 * Banned / soft-deleted / revoked sessionVersion are rejected.
 */
export async function getMessagingApiAuthPayload(
  request: NextRequest
): Promise<TokenPayload | null> {
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([cookieToken, headerToken])) {
    const payload = await decodeAccessJwtPayload(candidate);
    const active = await payloadIfActiveUser(payload);
    if (active) return active;
  }
  return null;
}
