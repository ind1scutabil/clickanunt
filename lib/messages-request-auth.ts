import type { NextRequest } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";
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
 * Auth pentru rute mesaje: Authorization, cookie accessToken, sau ?token= (necesar pentru EventSource).
 * Ordine: query (SSE), cookie httpOnly, apoi Bearer.
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([queryToken, cookieToken, headerToken])) {
    const payload = await verifyToken(candidate);
    if (!payload) continue;
    if ((payload as { type?: string }).type === "refresh") continue;
    const userId =
      payload.userId || (payload as { sub?: string }).sub;
    if (userId) return userId;
  }
  return null;
}

/**
 * GET/POST JSON mesaje — fără token în URL.
 * Bearer înainte de cookie: după `/api/auth/refresh` SPA actualizează localStorage dar cookie-ul
 * access poate fi încă vechi (până la Set-Cookie pe refresh); headerul reflectă tokenul nou.
 */
export async function getMessagingApiAuthPayload(
  request: NextRequest
): Promise<TokenPayload | null> {
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([headerToken, cookieToken])) {
    const payload = await verifyToken(candidate);
    if (!payload) continue;
    if ((payload as { type?: string }).type === "refresh") continue;
    if (payload.userId || (payload as { sub?: string }).sub) {
      return payload;
    }
  }
  return null;
}
