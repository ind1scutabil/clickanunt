/**
 * GET /api/listings/[id]/contact-phone — public reveal (rate-limited, no-store).
 * Phone is not in the initial public listing DTO; this is the only anonymous path.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/security/validation-schemas";
import { getRealIP } from "@/lib/cloudflare/config";
import { resolveRateLimit } from "@/lib/rate-limit-distributed";
import {
  PHONE_REVEAL_MAX_PER_HOUR,
  PHONE_REVEAL_WINDOW_MS,
} from "@/lib/infra/production-limits";
import {
  formatPhoneDisplay,
  isListingPhoneRevealEligible,
  normalizeContactPhoneForReveal,
  phoneToTelHref,
} from "@/lib/phone-display";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { messagingUserIdsEqual } from "@/lib/messaging-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

function json(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE, ...(extraHeaders ?? {}) },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const idCheck = uuidSchema.safeParse(params.id);
  if (!idCheck.success) {
    return json({ error: "ID invalid" }, 400);
  }
  const listingId = idCheck.data;

  const clientIp = getRealIP(request.headers) || "unknown";
  // Rate key never includes the phone number — only IP + listing id for burst control.
  const rl = await resolveRateLimit(`phone-reveal:ip:${clientIp}`, {
    windowMs: PHONE_REVEAL_WINDOW_MS,
    maxRequests: PHONE_REVEAL_MAX_PER_HOUR,
  });
  if (!rl.allowed) {
    const headers: Record<string, string> = {};
    if (typeof rl.retryAfter === "number" && rl.retryAfter > 0) {
      headers["Retry-After"] = String(rl.retryAfter);
    }
    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_contact_click,
      listingId,
      metadata: { reason: "phone_reveal_rate_limited", ok: false },
      request,
    });
    return json({ error: "Prea multe solicitări. Încearcă mai târziu." }, 429, headers);
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      contactPhone: true,
      status: true,
      moderationStatus: true,
      deletedAt: true,
      expiresAt: true,
      ownerUserId: true,
      owner: {
        select: { isBanned: true, deletedAt: true },
      },
    },
  });

  if (!listing) {
    return json({ error: "Anunțul nu există" }, 404);
  }

  const auth = await getMessagingApiAuthPayload(request);
  const viewerId = auth?.userId ?? null;
  const isOwner =
    !!viewerId && messagingUserIdsEqual(viewerId, listing.ownerUserId);

  // Public reveal requires public eligibility. Owner may reveal own number even if paused
  // (edit tools already expose it); admin does NOT get extra access via this public endpoint.
  if (!isOwner) {
    if (
      listing.owner?.deletedAt != null ||
      listing.owner?.isBanned === true
    ) {
      return json({ error: "Telefon indisponibil" }, 404);
    }
    if (!isListingPhoneRevealEligible(listing)) {
      return json({ error: "Telefon indisponibil" }, 404);
    }
  } else if (listing.deletedAt != null) {
    return json({ error: "Telefon indisponibil" }, 404);
  }

  const normalized = normalizeContactPhoneForReveal(listing.contactPhone);
  if (!normalized) {
    return json({ hasPhone: false, error: "Telefon indisponibil" }, 404);
  }

  const telHref = phoneToTelHref(normalized);
  if (!telHref) {
    return json({ hasPhone: false, error: "Telefon indisponibil" }, 404);
  }

  void recordAnalyticsEvent({
    eventType: ANALYTICS_EVENT.listing_contact_click,
    listingId,
    userId: viewerId ?? undefined,
    metadata: {
      reason: "phone_reveal",
      ok: true,
      anonymous: !viewerId,
      ownerReveal: isOwner,
    },
    request,
  });

  return json({
    hasPhone: true,
    phone: formatPhoneDisplay(normalized),
    telHref,
  }, 200);
}
