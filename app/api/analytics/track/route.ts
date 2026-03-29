/**
 * POST /api/analytics/track
 * Evenimente declanșate din browser (click telefon / WhatsApp / contact).
 * Necesită CSRF + rate limit; fără date inventate în UI.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { ANALYTICS_EVENT, recordAnalyticsEventsBatch } from "@/lib/analytics-events";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";

const trackBodySchema = z
  .object({
    eventType: z.enum([
      ANALYTICS_EVENT.listing_contact_click,
      ANALYTICS_EVENT.listing_phone_click,
      ANALYTICS_EVENT.listing_whatsapp_click,
    ]),
    listingId: z.string().uuid(),
  })
  .strict();

const handler = async (req: NextRequest): Promise<NextResponse> => {
  const security = await validateSecureRequest(req, {
    requireCSRF: true,
    rateLimit: null,
    schema: trackBodySchema,
  });

  if (!security.success) {
    const status = security.rateLimitError
      ? 429
      : security.csrfError
        ? 403
        : 400;
    return NextResponse.json({ error: security.error }, { status });
  }

  const { eventType, listingId } = security.data as z.infer<typeof trackBodySchema>;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
  }

  const actor = await getUserFromRequest(req);
  const uid = actor?.id ?? null;
  const baseMeta = { source: "client_track" as const };
  const items =
    eventType === ANALYTICS_EVENT.listing_contact_click
      ? [{ eventType, userId: uid, listingId, metadata: baseMeta }]
      : [
          {
            eventType: ANALYTICS_EVENT.listing_contact_click,
            userId: uid,
            listingId,
            metadata: { ...baseMeta, via: eventType },
          },
          { eventType, userId: uid, listingId, metadata: baseMeta },
        ];
  await recordAnalyticsEventsBatch(items, { request: req });

  return NextResponse.json({ ok: true });
};

export const POST = withRateLimit(handler, RATE_LIMITS.API);
