/**
 * Persisted analytics queue: fast INSERT, cron worker drains to analytics_events.
 * ANALYTICS_PERSISTED_QUEUE=true — safe across multiple app instances.
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type QueuedAnalyticsPayload = {
  eventType: string;
  userId?: string | null;
  sessionId?: string | null;
  listingId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ipHash?: string | null;
};

export async function enqueuePersistedAnalyticsEvent(payload: QueuedAnalyticsPayload): Promise<void> {
  await prisma.analyticsEventQueue.create({
    data: {
      id: randomUUID(),
      payload: payload as object,
    },
  });
}

export async function enqueuePersistedAnalyticsEventsBatch(payloads: QueuedAnalyticsPayload[]): Promise<void> {
  if (payloads.length === 0) return;
  await prisma.analyticsEventQueue.createMany({
    data: payloads.map((payload) => ({
      id: randomUUID(),
      payload: payload as object,
    })),
  });
}

export async function processAnalyticsQueueBatch(limit = 300): Promise<number> {
  const rows = await prisma.analyticsEventQueue.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (rows.length === 0) return 0;

  const payloads: QueuedAnalyticsPayload[] = [];
  for (const r of rows) {
    const p = r.payload as QueuedAnalyticsPayload;
    if (p?.eventType) payloads.push(p);
  }
  if (payloads.length === 0) {
    await prisma.analyticsEventQueue.deleteMany({ where: { id: { in: rows.map((x) => x.id) } } });
    return 0;
  }

  const bySession = new Map<string, { userId: string | null; ipHash: string | null }>();
  for (const p of payloads) {
    if (!p.sessionId) continue;
    const prev = bySession.get(p.sessionId) ?? { userId: null, ipHash: null };
    bySession.set(p.sessionId, {
      userId: p.userId ?? prev.userId,
      ipHash: p.ipHash ?? prev.ipHash,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const [sessionId, meta] of bySession) {
      await tx.analyticsSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          userId: meta.userId ?? undefined,
          ipHash: meta.ipHash ?? undefined,
        },
        update: {
          lastSeenAt: new Date(),
          ...(meta.userId ? { userId: meta.userId } : {}),
          ...(meta.ipHash ? { ipHash: meta.ipHash } : {}),
        },
      });
    }

    await tx.analyticsEvent.createMany({
      data: payloads.map((p) => ({
        eventType: p.eventType.slice(0, 80),
        userId: p.userId ?? undefined,
        sessionId: p.sessionId ?? undefined,
        listingId: p.listingId ?? undefined,
        metadata:
          p.metadata === null || p.metadata === undefined
            ? undefined
            : (p.metadata as Prisma.InputJsonValue),
      })),
    });

    await tx.analyticsEventQueue.deleteMany({
      where: { id: { in: rows.map((x) => x.id) } },
    });
  });

  return rows.length;
}
