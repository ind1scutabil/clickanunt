import type { NextRequest } from "next/server";
import type { TokenPayload } from "@/lib/auth";
import { decodeAccessJwtPayload } from "@/lib/auth";
import { normalizeJwtInput } from "@/lib/jwt-normalize";

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

/**
 * Auth SSE: ?token= (EventSource), cookie httpOnly, apoi Bearer / Authorization brut.
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([queryToken, cookieToken, headerToken])) {
    const payload = await decodeAccessJwtPayload(candidate);
    if (payload?.userId) return payload.userId;
  }
  return null;
}

/**
 * GET/POST JSON mesaje: Bearer înainte de cookie — după refresh SPA are Bearer nou, cookie poate întârzia.
 */
export async function getMessagingApiAuthPayload(
  request: NextRequest
): Promise<TokenPayload | null> {
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([headerToken, cookieToken])) {
    const payload = await decodeAccessJwtPayload(candidate);
    if (payload) return payload;
  }
  return null;
}
