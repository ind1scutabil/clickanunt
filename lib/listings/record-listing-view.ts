/**
 * Listing view recording — the single place that increments `listing.views`.
 *
 * Counting is an explicit action (POST /api/listings/[id]/view), never a side effect of
 * a GET, an SSR render, metadata generation or a prefetch.
 *
 * Increment + `listing_view` analytics row are written in one transaction guarded by a
 * Postgres advisory lock, so dedupe holds across every PM2 instance (fork or cluster)
 * and two concurrent requests for the same session cannot both count.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { analyticsContextMetadata, buildAnalyticsContext } from "@/lib/analytics-context";
import { getClientIp } from "@/lib/rateLimit";
import { resolveRateLimit } from "@/lib/rate-limit-distributed";
import { shouldSkipListingViewForAutomation } from "@/lib/listing-view-count";

/** Same window as lib/analytics-dedupe.ts listing_view (90s). */
export const LISTING_VIEW_DEDUPE_WINDOW_MS = 90 * 1000;

/** Browse cap per IP — mirrors the previous GET-based limit. */
const LISTING_VIEW_IP_WINDOW_MS = 60 * 1000;
const LISTING_VIEW_IP_MAX = 200;

export type ListingViewSkipReason =
  | "owner"
  | "automation"
  | "rate_limited"
  | "duplicate"
  | "not_found";

export type ListingViewResult = {
  /** True only when listing.views was incremented by this request. */
  counted: boolean;
  /** Authoritative counter value after this request. */
  views: number;
  reason?: ListingViewSkipReason;
};

async function currentViews(listingId: string): Promise<number | null> {
  const row = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { views: true },
  });
  return row ? row.views : null;
}

/**
 * Atomically claim the dedupe slot and increment.
 *
 * pg_advisory_xact_lock serialises concurrent requests sharing the same dedupe key;
 * the existing `listing_view` row inside the window is what makes the claim persistent
 * and visible to every process.
 */
async function claimAndIncrement(opts: {
  listingId: string;
  sessionId: string;
  viewerId: string | null;
  metadata: Record<string, unknown> | null;
  ipHash: string | null;
}): Promise<ListingViewResult> {
  const since = new Date(Date.now() - LISTING_VIEW_DEDUPE_WINDOW_MS);
  const lockKey = `listing_view:${opts.listingId}:${opts.sessionId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

    const duplicate = await tx.analyticsEvent.findFirst({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        sessionId: opts.sessionId,
        listingId: opts.listingId,
        createdAt: { gte: since },
      },
      select: { id: true },
    });

    if (duplicate) {
      const row = await tx.listing.findUnique({
        where: { id: opts.listingId },
        select: { views: true },
      });
      return { counted: false, views: row?.views ?? 0, reason: "duplicate" as const };
    }

    const updated = await tx.listing.update({
      where: { id: opts.listingId },
      data: { views: { increment: 1 } },
      select: { views: true },
    });

    // analytics_events.sessionId is a FK to analytics_sessions — the row must exist first.
    await tx.analyticsSession.upsert({
      where: { id: opts.sessionId },
      create: {
        id: opts.sessionId,
        userId: opts.viewerId ?? undefined,
        ipHash: opts.ipHash ?? undefined,
      },
      update: {
        lastSeenAt: new Date(),
        ...(opts.viewerId ? { userId: opts.viewerId } : {}),
        ...(opts.ipHash ? { ipHash: opts.ipHash } : {}),
      },
    });

    await tx.analyticsEvent.create({
      data: {
        eventType: ANALYTICS_EVENT.listing_view,
        userId: opts.viewerId ?? undefined,
        sessionId: opts.sessionId,
        listingId: opts.listingId,
        metadata: (opts.metadata ?? undefined) as never,
      },
    });

    return { counted: true, views: updated.views };
  });
}

/**
 * Record one listing view. Returns the authoritative counter so the UI never invents a value.
 */
export async function recordListingView(opts: {
  request: NextRequest;
  listingId: string;
  viewerId: string | null;
  isOwnerOrAdmin: boolean;
}): Promise<ListingViewResult> {
  const views = await currentViews(opts.listingId);
  if (views === null) {
    return { counted: false, views: 0, reason: "not_found" };
  }

  // Owner/admin self-views (detail, edit, promote, messages) must not inflate counters.
  if (opts.isOwnerOrAdmin) {
    return { counted: false, views, reason: "owner" };
  }

  if (shouldSkipListingViewForAutomation(opts.request)) {
    return { counted: false, views, reason: "automation" };
  }

  const clientIp = getClientIp(opts.request);
  const browse = await resolveRateLimit(`listing:view:ip:${clientIp}`, {
    windowMs: LISTING_VIEW_IP_WINDOW_MS,
    maxRequests: LISTING_VIEW_IP_MAX,
  });
  if (!browse.allowed) {
    return { counted: false, views, reason: "rate_limited" };
  }

  const ctx = buildAnalyticsContext(opts.request);
  const metadata = analyticsContextMetadata(opts.request, { source: "listing_view_beacon" });

  if (ctx.sessionId) {
    return claimAndIncrement({
      listingId: opts.listingId,
      sessionId: ctx.sessionId,
      viewerId: opts.viewerId,
      metadata,
      ipHash: ctx.ipHash,
    });
  }

  // No session id (non-browser client). Fall back to a per-IP dedupe window; this is the
  // only path that is not backed by the advisory lock, so keep the window identical.
  const fallbackKey = ctx.ipHash
    ? `listing:view:iphash:${ctx.ipHash}:${opts.listingId}`
    : `listing:view:nosession:${opts.listingId}`;
  const slot = await resolveRateLimit(fallbackKey, {
    windowMs: LISTING_VIEW_DEDUPE_WINDOW_MS,
    maxRequests: 1,
  });
  if (!slot.allowed) {
    return { counted: false, views, reason: "duplicate" };
  }

  const updated = await prisma.listing.update({
    where: { id: opts.listingId },
    data: { views: { increment: 1 } },
    select: { views: true },
  });
  return { counted: true, views: updated.views };
}
