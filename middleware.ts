/**
 * Next.js Middleware - Cache Control for Auth Pages + Security Headers
 * Prevents caching of auth pages and API routes
 * Applies security headers globally
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const traceId = request.headers.get('x-request-id') || crypto.randomUUID();
  requestHeaders.set('x-request-id', traceId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', traceId);
  const path = request.nextUrl.pathname;

  const isMessagesRoute = path === "/messages" || path === "/dashboard/messages";

  // Add no-cache headers for auth pages and API auth routes
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

  // Apply security headers to all responses
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
