/**
 * Next.js Proxy (fost middleware) — cache control pentru auth/mesaje + headere securitate.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";
import { buildWwwRedirectUrl, shouldRedirectApexToWww } from "@/lib/seo/apex-canonical-host";

export function proxy(request: NextRequest) {
  const hostname =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    request.nextUrl.hostname;

  if (shouldRedirectApexToWww(hostname)) {
    const target = buildWwwRedirectUrl(request.nextUrl, true);
    return NextResponse.redirect(target.href, 301);
  }

  const requestHeaders = new Headers(request.headers);
  const traceId = request.headers.get("x-request-id") || crypto.randomUUID();
  requestHeaders.set("x-request-id", traceId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", traceId);
  const path = request.nextUrl.pathname;

  const isMessagesRoute = path === "/messages" || path === "/dashboard/messages";

  if (
    path.startsWith("/auth/") ||
    path.startsWith("/api/auth/") ||
    isMessagesRoute
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    if (isMessagesRoute) {
      response.headers.set("Clear-Site-Data", '"cache"');
    }
  }

  return applySecurityHeaders(response, hostname ?? null);
}

export const config = {
  matcher: [
    // Include `/_next/static` so localhost `npm start` gets host-aware CSP/HSTS via proxy.
    "/((?!_next/image|favicon.ico).*)",
  ],
};
