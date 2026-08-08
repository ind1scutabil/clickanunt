/**
 * POST /api/listings/[id]/view
 * Explicit listing-view beacon from the detail page. This is the only route that
 * increments `listing.views`; GET /api/listings/[id] stays read-only.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uuidSchema } from "@/lib/security/validation-schemas";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { recordListingView } from "@/lib/listings/record-listing-view";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";

/** Tiny JSON body (`{}`) only — reject oversized payloads before any DB work. */
const MAX_VIEW_BODY_BYTES = 2048;

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "46.225.69.155"]);

function isAllowedViewOriginHost(hostname: string, requestHostHeader: string | null): boolean {
  const h = hostname.toLowerCase();
  if (h === "clickanunt.ro" || h === "www.clickanunt.ro" || h.endsWith(".clickanunt.ro")) {
    return true;
  }
  if (!DEV_HOSTS.has(h)) return false;
  // `next start` sets NODE_ENV=production even on localhost — allow local origins only
  // when the request Host is also local or an explicit E2E/non-prod marker is set.
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.CLICKANUNT_E2E_SERVER === "1") return true;
  const reqHost = (requestHostHeader || "").split(":")[0].trim().toLowerCase();
  return DEV_HOSTS.has(reqHost);
}

/**
 * Defense in depth beyond CSRF + SameSite:
 * - reject Sec-Fetch-Site: cross-site (modern browsers on cross-origin form/fetch)
 * - if Origin is present, it must be an allowed host (do not fall back to Host)
 * - cap Content-Length so the endpoint cannot be used as a large-body sink
 */
function rejectAbusiveViewRequest(request: NextRequest): NextResponse | null {
  const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "cross-site") {
    return NextResponse.json(
      { error: "Cross-site request rejected" },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin && origin !== "null") {
    try {
      const hostname = new URL(origin).hostname;
      if (!isAllowedViewOriginHost(hostname, request.headers.get("host"))) {
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403, headers: noStoreHeaders() },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403, headers: noStoreHeaders() },
      );
    }
  }

  const rawLen = request.headers.get("content-length");
  if (rawLen != null && rawLen !== "") {
    const len = Number(rawLen);
    if (!Number.isFinite(len) || len < 0 || len > MAX_VIEW_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: noStoreHeaders() },
      );
    }
  }

  return null;
}

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
  };
}

function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: noStoreHeaders() });
}

async function handler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!uuidSchema.safeParse(id).success) {
    return json({ error: "Invalid listing id" }, 400);
  }

  const abusive = rejectAbusiveViewRequest(request);
  if (abusive) return abusive;

  const security = await validateSecureRequest(request, {
    requireCSRF: true,
    rateLimit: null,
  });
  if (!security.success) {
    const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
    return json({ error: security.error }, status);
  }

  if (process.env.USE_IN_MEMORY_DB === "true") {
    return json({ counted: false, views: 0 });
  }

  const listing = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
      deletedAt: true,
    },
  });
  if (!listing) {
    return json({ error: "Not found" }, 404);
  }

  // Viewer identity comes only from the session/auth cookie via getUserFromRequest —
  // the client cannot pick an arbitrary user id in the body or query string.
  const viewer = await getUserFromRequest(request);
  const isOwnerOrAdmin =
    !!viewer &&
    (viewer.id === listing.ownerUserId ||
      hasPermission(viewer.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
      hasPermission(viewer.role as UserRole, Permission.MODERATION_APPROVE_REJECT));

  // Same generic 404 as the detail route — no existence leak for non-public listings.
  if (!isOwnerOrAdmin && !isListingSeoIndexable(listing)) {
    return json({ error: "Not found" }, 404);
  }

  const result = await recordListingView({
    request,
    listingId: id,
    viewerId: viewer?.id ?? null,
    isOwnerOrAdmin,
  });

  return json({ counted: result.counted, views: result.views });
}

export const POST = withRateLimit(handler, RATE_LIMITS.API);
