/**
 * Next.js Proxy (fost middleware) — cache control pentru auth/mesaje + headere securitate.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";
import { buildWwwRedirectUrl, shouldRedirectApexToWww } from "@/lib/seo/apex-canonical-host";

const SITE_ORIGINS = new Set(["https://clickanunt.ro", "https://www.clickanunt.ro"]);

function applySiteCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin")?.trim();
  if (origin && SITE_ORIGINS.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-csrf-token, X-CSRF-Token, X-Requested-With"
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.append("Vary", "Origin");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const hostname =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    request.nextUrl.hostname;

  if (shouldRedirectApexToWww(hostname)) {
    const target = buildWwwRedirectUrl(request.nextUrl, true);
    /** 308 for API — preserve POST method + body; 301 for pages (SEO). */
    const redirectStatus = request.nextUrl.pathname.startsWith("/api/") ? 308 : 301;
    return NextResponse.redirect(target.href, redirectStatus);
  }

  const path = request.nextUrl.pathname;

  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
    return applySecurityHeaders(applySiteCors(request, preflight), hostname ?? null);
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

  const withCors = path.startsWith("/api/") ? applySiteCors(request, response) : response;
  return applySecurityHeaders(withCors, hostname ?? null);
}

export const config = {
  matcher: [
    // Include `/_next/static` so localhost `npm start` gets host-aware CSP/HSTS via proxy.
    "/((?!_next/image|favicon.ico).*)",
  ],
};
