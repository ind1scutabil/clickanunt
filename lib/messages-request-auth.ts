import type { NextRequest } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";

function uniqMessagingTokens(tokens: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const t = typeof raw === "string" ? raw.trim() : "";
    if (!t || t === "null" || t === "undefined") continue;
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
 * Ordine: query (SSE), cookie httpOnly, Bearer — cookie înainte de header evită Bearer desincron din localStorage.
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([queryToken, cookieToken, headerToken])) {
    const payload = await verifyToken(candidate);
    if (!payload) continue;
    const userId =
      payload.userId || (payload as { sub?: string }).sub;
    if (userId) return userId;
  }
  return null;
}

/**
 * GET/POST JSON mesaje — fără token în URL. Preferă cookie httpOnly înaintea Bearer.
 */
export async function getMessagingApiAuthPayload(
  request: NextRequest
): Promise<TokenPayload | null> {
  const headerToken = bearerFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("accessToken")?.value?.trim();

  for (const candidate of uniqMessagingTokens([cookieToken, headerToken])) {
    const payload = await verifyToken(candidate);
    if (payload?.userId || (payload as { sub?: string })?.sub) {
      return payload;
    }
  }
  return null;
}
