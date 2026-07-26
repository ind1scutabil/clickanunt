/**
 * Listing view counting — rate limits + dedupe so bots cannot inflate views via GET /api/listings/[id].
 * Legitimate browsers send x-analytics-session-id (90s session dedupe); others use IP+listing window.
 *
 * Owner/admin exclusion is applied in the GET route (auth already resolved).
 * UA / Purpose header skips are best-effort only (spoofable; not Cloudflare-grade).
 */

import type { NextRequest } from "next/server";
import { analyticsEventWouldDuplicate } from "@/lib/analytics-dedupe";
import { buildAnalyticsContext } from "@/lib/analytics-context";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { getClientIp } from "@/lib/rateLimit";
import { resolveRateLimit } from "@/lib/rate-limit-distributed";
import type { RateLimitResult } from "@/lib/rateLimit";

/** Browse cap per IP — listing JSON still returned when exceeded; view not incremented. */
const LISTING_GET_IP_WINDOW_MS = 60 * 1000;
const LISTING_GET_IP_MAX = 200;

/** Same window as session dedupe (lib/analytics-dedupe.ts listing_view: 90s). */
const LISTING_VIEW_DEDUPE_WINDOW_MS = 90 * 1000;

/** Soft bot/automation UA markers — spoofable; exclude only obvious crawlers/tests. */
const AUTOMATION_UA_RE =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|embedly|quora link preview|outbrain|pinterest\/0\.|google-inspectiontool|headlesschrome|playwright|puppeteer|phantomjs|wget|curl\//i;

export type ListingGetRateLimitResult = RateLimitResult & {
  /** When false, skip view increment + analytics (abuse or duplicate). */
  shouldCountView: boolean;
};

/**
 * Best-effort skip for prefetch / known automation UAs.
 * Not a substitute for Cloudflare bot management — headers are spoofable.
 */
export function shouldSkipListingViewForAutomation(request: NextRequest): boolean {
  const purpose = (
    request.headers.get("sec-purpose") ||
    request.headers.get("purpose") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;

  const ua = request.headers.get("user-agent") || "";
  if (!ua.trim()) return true;
  if (AUTOMATION_UA_RE.test(ua)) return true;

  return false;
}

/**
 * Rate-limit GET /api/listings/[id] per IP. Always allow reading the listing payload.
 */
export async function resolveListingGetRequestLimits(
  request: NextRequest,
  listingId: string
): Promise<ListingGetRateLimitResult> {
  const clientIp = getClientIp(request);
  const browse = await resolveRateLimit(`listing:get:ip:${clientIp}`, {
    windowMs: LISTING_GET_IP_WINDOW_MS,
    maxRequests: LISTING_GET_IP_MAX,
  });

  if (!browse.allowed) {
    return { ...browse, shouldCountView: false };
  }

  if (shouldSkipListingViewForAutomation(request)) {
    return { ...browse, shouldCountView: false };
  }

  const shouldCountView = await shouldIncrementListingView(request, listingId);
  return { ...browse, shouldCountView };
}

/**
 * Whether to increment listing.views and record listing_view analytics for this GET
 * (before owner/admin exclusion).
 */
export async function shouldIncrementListingView(
  request: NextRequest,
  listingId: string
): Promise<boolean> {
  const ctx = buildAnalyticsContext(request);

  if (ctx.sessionId) {
    const dup = await analyticsEventWouldDuplicate({
      eventType: ANALYTICS_EVENT.listing_view,
      sessionId: ctx.sessionId,
      listingId,
    });
    return !dup;
  }

  if (ctx.ipHash) {
    const rl = await resolveRateLimit(
      `listing:view:iphash:${ctx.ipHash}:${listingId}`,
      {
        windowMs: LISTING_VIEW_DEDUPE_WINDOW_MS,
        maxRequests: 1,
      }
    );
    return rl.allowed;
  }

  const rl = await resolveRateLimit(`listing:view:nosession:${listingId}`, {
    windowMs: LISTING_VIEW_DEDUPE_WINDOW_MS,
    maxRequests: 2,
  });
  return rl.allowed;
}

/**
 * Final gate after rate-limit / automation checks and auth resolution.
 * Owner/admin never inflate views; does not distinguish API GET vs page render.
 */
export function finalizeShouldCountListingView(opts: {
  shouldCountView: boolean;
  isOwnerOrAdmin: boolean;
}): boolean {
  return opts.shouldCountView && !opts.isOwnerOrAdmin;
}
