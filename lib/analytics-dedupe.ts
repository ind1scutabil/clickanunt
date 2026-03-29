/**
 * Skip duplicate analytics events for the same session (refresh spam, double taps).
 * No session id → cannot dedupe; event is always recorded.
 */

import { prisma } from "@/lib/prisma";

/**
 * Per-session dedupe window (seconds). Only listed event types are deduped.
 * Omitted types (e.g. search_performed, promotion_*, message_sent, report_created): no dedupe — each action counts.
 */
const WINDOW_SEC: Record<string, number> = {
  listing_view: 90,
  listing_contact_click: 45,
  listing_phone_click: 45,
  listing_whatsapp_click: 45,
  listing_favorite_added: 3,
  listing_favorite_removed: 3,
  login_success: 3600,
};

export function dedupeWindowSeconds(eventType: string): number | null {
  return WINDOW_SEC[eventType] ?? null;
}

export async function analyticsEventWouldDuplicate(input: {
  eventType: string;
  sessionId: string | null | undefined;
  listingId?: string | null;
  userId?: string | null;
}): Promise<boolean> {
  if (!input.sessionId) return false;

  const windowSec = dedupeWindowSeconds(input.eventType);
  if (windowSec == null) return false;

  const since = new Date(Date.now() - windowSec * 1000);

  const existing = await prisma.analyticsEvent.findFirst({
    where: {
      eventType: input.eventType.slice(0, 80),
      sessionId: input.sessionId,
      createdAt: { gte: since },
      ...(input.listingId ? { listingId: input.listingId } : {}),
    },
    select: { id: true },
  });

  return Boolean(existing);
}
