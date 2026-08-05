import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import {
  cookieDomainFromRequest,
  cookieSecureFromRequest,
} from "@/lib/cookie-domain";

/**
 * Clear auth cookies for both host-only and parent-domain variants.
 * Login may set `domain=.clickanunt.ro`; a bare `cookies.delete` leaves that cookie alive.
 */
export function clearAuthCookies(
  response: NextResponse,
  request: NextRequest
): void {
  const secure = cookieSecureFromRequest(request);
  const parentDomain = cookieDomainFromRequest(request);

  const variants: Array<{ domain?: string }> = [{}, ...(parentDomain ? [{ domain: parentDomain }] : [])];

  for (const { domain } of variants) {
    const base = {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      ...(domain ? { domain } : {}),
    };
    response.cookies.set("accessToken", "", base);
    response.cookies.set("refreshToken", "", base);
  }
}
