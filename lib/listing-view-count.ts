/**
 * Guards shared by the listing detail read path and the view beacon.
 *
 * Counting itself lives in lib/listings/record-listing-view.ts — GET /api/listings/[id]
 * is read-only and must never consume a dedupe slot, otherwise the beacon that follows
 * the same page view would be treated as a duplicate.
 */

import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { resolveRateLimit } from "@/lib/rate-limit-distributed";
import type { RateLimitResult } from "@/lib/rateLimit";

/** Browse cap per IP — listing JSON is still returned when exceeded. */
const LISTING_GET_IP_WINDOW_MS = 60 * 1000;
const LISTING_GET_IP_MAX = 200;

/** Soft bot/automation UA markers — spoofable; exclude only obvious crawlers/tests. */
const AUTOMATION_UA_RE =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|embedly|quora link preview|outbrain|pinterest\/0\.|google-inspectiontool|headlesschrome|playwright|puppeteer|phantomjs|wget|curl\//i;

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
 * Per-IP browse limit for GET /api/listings/[id]. Read-only: no dedupe slot is consumed
 * and no counter is touched.
 */
export async function resolveListingGetBrowseLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  const clientIp = getClientIp(request);
  return resolveRateLimit(`listing:get:ip:${clientIp}`, {
    windowMs: LISTING_GET_IP_WINDOW_MS,
    maxRequests: LISTING_GET_IP_MAX,
  });
}

/**
 * Final gate after automation checks and auth resolution.
 * Owner/admin never inflate views.
 */
export function finalizeShouldCountListingView(opts: {
  shouldCountView: boolean;
  isOwnerOrAdmin: boolean;
}): boolean {
  return opts.shouldCountView && !opts.isOwnerOrAdmin;
}
