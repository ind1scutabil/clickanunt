/**
 * Roll up analytics_events into analytics_daily for a UTC calendar day.
 */

import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { randomUUID } from "crypto";

function utcDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function rollupAnalyticsDailyForDate(dayUtc: Date): Promise<void> {
  const { start, end } = utcDayBounds(dayUtc);

  const [
    listingViews,
    contactClicks,
    messagesSent,
    searchesPerformed,
    loginSuccess,
    uniqueSessions,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_contact_click,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.message_sent,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.search_performed,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.login_success,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(DISTINCT "sessionId")::bigint AS c
      FROM "analytics_events"
      WHERE "sessionId" IS NOT NULL
        AND "createdAt" >= ${start}
        AND "createdAt" < ${end}
    `.then((r) => Number(r[0]?.c ?? 0)),
  ]);

  const dayOnly = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

  await prisma.analyticsDaily.upsert({
    where: { day: dayOnly },
    create: {
      id: randomUUID(),
      day: dayOnly,
      listingViews,
      contactClicks,
      messagesSent,
      searchesPerformed,
      loginSuccess,
      uniqueSessions,
    },
    update: {
      listingViews,
      contactClicks,
      messagesSent,
      searchesPerformed,
      loginSuccess,
      uniqueSessions,
    },
  });
}
