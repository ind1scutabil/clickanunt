/**
 * Persisted product analytics — PostgreSQL analytics_events + analytics_sessions.
 * Sampling, dedupe, optional persisted queue (ANALYTICS_PERSISTED_QUEUE), optional defer (ANALYTICS_DEFER_MICROTASK).
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { buildAnalyticsContext } from "@/lib/analytics-context";
import { analyticsEventWouldDuplicate } from "@/lib/analytics-dedupe";
import { shouldRecordListingView } from "@/lib/analytics-sampling";
import {
  enqueuePersistedAnalyticsEvent,
  enqueuePersistedAnalyticsEventsBatch,
} from "@/lib/analytics-queue-persist";

export const ANALYTICS_EVENT = {
  listing_view: "listing_view",
  listing_contact_click: "listing_contact_click",
  listing_phone_click: "listing_phone_click",
  listing_whatsapp_click: "listing_whatsapp_click",
  listing_favorite_added: "listing_favorite_added",
  listing_favorite_removed: "listing_favorite_removed",
  listing_created: "listing_created",
  listing_updated: "listing_updated",
  listing_deleted: "listing_deleted",
  message_sent: "message_sent",
  report_created: "report_created",
  promotion_purchased: "promotion_purchased",
  promotion_activated: "promotion_activated",
  login_success: "login_success",
  moderation_action: "moderation_action",
  search_performed: "search_performed",
} as const;

export type AnalyticsEventTypeName = (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];

/** Not a React hook — name avoids eslint react-hooks/rules-of-hooks false positives. */
function persistedQueueEnabled(): boolean {
  return process.env.ANALYTICS_PERSISTED_QUEUE === "true";
}

function deferMicrotaskEnabled(): boolean {
  return process.env.ANALYTICS_DEFER_MICROTASK === "true" && !persistedQueueEnabled();
}

async function touchAnalyticsSession(
  sessionId: string,
  userId?: string | null,
  ipHash?: string | null
): Promise<void> {
  await prisma.analyticsSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId: userId ?? undefined,
      ipHash: ipHash ?? undefined,
    },
    update: {
      lastSeenAt: new Date(),
      ...(userId ? { userId } : {}),
      ...(ipHash ? { ipHash } : {}),
    },
  });
}

export async function recordAnalyticsEvent(input: {
  eventType: string;
  userId?: string | null;
  sessionId?: string | null;
  listingId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  request?: NextRequest | null;
}): Promise<void> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return;
  }

  if (input.eventType === ANALYTICS_EVENT.listing_view && !shouldRecordListingView()) {
    return;
  }

  const ctx = buildAnalyticsContext(input.request ?? null);
  const sessionId = input.sessionId ?? ctx.sessionId;
  const ipHash = ctx.ipHash;

  const run = async (): Promise<void> => {
    if (
      await analyticsEventWouldDuplicate({
        eventType: input.eventType,
        sessionId,
        listingId: input.listingId ?? null,
        userId: input.userId ?? null,
      })
    ) {
      return;
    }

    if (persistedQueueEnabled()) {
      await enqueuePersistedAnalyticsEvent({
        eventType: input.eventType,
        userId: input.userId ?? null,
        sessionId,
        listingId: input.listingId ?? null,
        metadata: input.metadata ?? null,
        ipHash,
      });
      return;
    }

    if (sessionId) {
      await touchAnalyticsSession(sessionId, input.userId ?? null, ipHash);
    }

    await prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType.slice(0, 80),
        userId: input.userId ?? undefined,
        sessionId: sessionId ?? undefined,
        listingId: input.listingId ?? undefined,
        metadata:
          input.metadata === null || input.metadata === undefined
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  };

  if (deferMicrotaskEnabled()) {
    queueMicrotask(() => {
      void run().catch((e) => console.error("[analytics-events] deferred failed", e));
    });
    return;
  }

  try {
    await run();
  } catch (e) {
    console.error("[analytics-events] recordAnalyticsEvent failed", {
      eventType: input.eventType,
      error: e,
    });
  }
}

export async function recordAnalyticsEventsBatch(
  items: Array<{
    eventType: string;
    userId?: string | null;
    listingId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }>,
  options: { request?: NextRequest | null }
): Promise<void> {
  if (process.env.USE_IN_MEMORY_DB === "true" || items.length === 0) return;

  const ctx = buildAnalyticsContext(options.request ?? null);
  const sessionId = ctx.sessionId;
  const ipHash = ctx.ipHash;

  const run = async (): Promise<void> => {
    const toWrite: typeof items = [];
    for (const item of items) {
      if (item.eventType === ANALYTICS_EVENT.listing_view && !shouldRecordListingView()) {
        continue;
      }
      if (
        await analyticsEventWouldDuplicate({
          eventType: item.eventType,
          sessionId,
          listingId: item.listingId ?? null,
          userId: item.userId ?? null,
        })
      ) {
        continue;
      }
      toWrite.push(item);
    }
    if (toWrite.length === 0) return;

    if (persistedQueueEnabled()) {
      await enqueuePersistedAnalyticsEventsBatch(
        toWrite.map((item) => ({
          eventType: item.eventType,
          userId: item.userId ?? null,
          sessionId,
          listingId: item.listingId ?? null,
          metadata: item.metadata ?? null,
          ipHash,
        }))
      );
      return;
    }

    const userId = items.find((i) => i.userId)?.userId ?? null;
    if (sessionId) {
      await touchAnalyticsSession(sessionId, userId, ipHash);
    }

    await prisma.$transaction(
      toWrite.map((item) =>
        prisma.analyticsEvent.create({
          data: {
            eventType: item.eventType.slice(0, 80),
            userId: item.userId ?? undefined,
            sessionId: sessionId ?? undefined,
            listingId: item.listingId ?? undefined,
            metadata:
              item.metadata === null || item.metadata === undefined
                ? undefined
                : (item.metadata as Prisma.InputJsonValue),
          },
        })
      )
    );
  };

  if (deferMicrotaskEnabled()) {
    queueMicrotask(() => {
      void run().catch((e) => console.error("[analytics-events] batch deferred failed", e));
    });
    return;
  }

  try {
    await run();
  } catch (e) {
    console.error("[analytics-events] recordAnalyticsEventsBatch failed", e);
  }
}
