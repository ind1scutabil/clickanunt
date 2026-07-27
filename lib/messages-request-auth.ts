import type { NextRequest } from "next/server";
import type { TokenPayload } from "@/lib/auth";
import { decodeAccessJwtPayload } from "@/lib/auth";
import { normalizeJwtInput } from "@/lib/jwt-normalize";
import { db } from "@/lib/db";

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
  return payload;
}

/**
 * Auth SSE: ?token= (EventSource), cookie httpOnly, apoi Bearer / Authorization brut.
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([queryToken, cookieToken, headerToken])) {
    const payload = await decodeAccessJwtPayload(candidate);
    const active = await payloadIfActiveUser(payload);
    if (active?.userId) return active.userId;
  }
  return null;
}

/**
 * GET/POST JSON mesaje: cookie httpOnly înainte de Bearer.
 * Pe live, `localStorage` poate rămâne cu access expirat în timp ce cookie-ul `.clickanunt.ro`
 * e încă valabil — ordinea veche (Bearer primul) ducea la 401 intermitent pe pagina anunțului.
 * Banned / soft-deleted users are rejected even if JWT is unexpired.
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
