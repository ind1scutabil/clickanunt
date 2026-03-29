import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Auth pentru rute mesaje: Authorization, cookie accessToken, sau ?token= (necesar pentru EventSource).
 */
export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = request.headers.get("authorization")?.replace("Bearer ", "")?.trim();
  const cookieToken = request.cookies.get("accessToken")?.value;
  const candidates = [queryToken, headerToken, cookieToken].filter(
    (t): t is string => !!t && t !== "null" && t !== "undefined"
  );

  for (const candidate of candidates) {
    const payload = await verifyToken(candidate);
    if (!payload) continue;
    const userId =
      (payload as { userId?: string; sub?: string }).userId ||
      (payload as { sub?: string }).sub;
    if (userId) return userId;
  }
  return null;
}
