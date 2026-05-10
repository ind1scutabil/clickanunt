import type { NextRequest } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { normalizeJwtInput } from "@/lib/jwt-normalize";
import { verifyJwtHs256AccessFlexible } from "@/lib/security/tokens";

function payloadFromFlexible(
  flex: NonNullable<ReturnType<typeof verifyJwtHs256AccessFlexible>>
): TokenPayload {
  return {
    userId: flex.userId,
    email: flex.email,
    role: flex.role ?? "user",
    type: "access",
  } as TokenPayload;
}

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

function payloadExpSeconds(p: TokenPayload): number {
  const e = (p as { exp?: unknown }).exp;
  return typeof e === "number" ? e : 0;
}

/**
 * În caz sunt mai mulți candidați (SSE ?token=, Authorization, cookie), ia tokenul ACTIV cel mai bun
 * după `exp`; evită scenariile în care un access vechi în localStorage pare „prioritar” și ambele sunt trimise.
 */
async function resolveBestAccessPayloadFromCandidates(
  rawCandidates: Array<string | null | undefined>
): Promise<TokenPayload | null> {
  const candidates = uniqMessagingTokens(rawCandidates);
  let best: TokenPayload | null = null;

  for (const candidate of candidates) {
    let payload = await verifyToken(candidate);
    if (!payload) {
      const flex = verifyJwtHs256AccessFlexible(candidate);
      if (flex) payload = payloadFromFlexible(flex);
    }
    if (!payload) continue;
    if ((payload as { type?: string }).type === "refresh") continue;

    const userId =
      payload.userId || (payload as { sub?: string }).sub;
    if (!userId) continue;

    if (!best) {
      best = payload;
      continue;
    }
    const expCand = payloadExpSeconds(payload);
    const expBest = payloadExpSeconds(best);
    /** Preferă expirarea mai mare (token mai proaspăt / durată mai lungă dată aceeași familie JWT). */
    if (expCand > expBest) {
      best = payload;
    }
  }

  return best;
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

  const payload = await resolveBestAccessPayloadFromCandidates([
    queryToken,
    cookieToken,
    headerToken,
  ]);
  if (!payload) return null;
  return payload.userId || (payload as { sub?: string }).sub || null;
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

  return resolveBestAccessPayloadFromCandidates([headerToken, cookieToken]);
}
