/**
 * Next.js Middleware - Cache Control for Auth Pages
 * Prevents caching of auth pages and API routes
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add no-cache headers for auth pages and API auth routes
  if (
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};
