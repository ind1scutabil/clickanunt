/**
 * Enterprise admin control center — aggregates from Prisma only (no mock data).
 */

import { prisma } from "@/lib/prisma";
import { PaymentStatus, ReportStatus } from "@prisma/client";
import { getAuditLogs } from "@/lib/audit";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { runAnalyticsMetricsValidation } from "@/lib/analytics-validation";
import { computeAnalyticsAlerts } from "@/lib/analytics-alerts";
import { countAnalyticsOrphans } from "@/lib/analytics-integrity";

function utcDayStart(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysAgoUtc(days: number): Date {
  const x = utcDayStart();
  x.setUTCDate(x.getUTCDate() - days);
  return x;
}

async function hasAnyAnalyticsEvents(): Promise<boolean> {
  const one = await prisma.analyticsEvent.findFirst({ select: { id: true } });
  return Boolean(one);
}

async function dailySeries(
  table: "listings" | "messages" | "users",
  since: Date
): Promise<Array<{ date: string; count: number }>> {
  const col =
    table === "listings"
      ? prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT (DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
        FROM "listings"
        WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `
      : table === "messages"
        ? prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT (DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
        FROM "messages"
        WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `
        : prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT (DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
        FROM "users"
        WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `;

  const rows = await col;
  return rows.map((r) => ({
    date: (r.d instanceof Date ? r.d : new Date(r.d as string)).toISOString().slice(0, 10),
    count: Number(r.c),
  }));
}

async function dailyEventSeries(
  eventType: string,
  since: Date
): Promise<Array<{ date: string; count: number }>> {
  const rows = await prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
    SELECT (DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
    FROM "analytics_events"
    WHERE "eventType" = ${eventType}
      AND "createdAt" >= ${since}
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((r) => ({
    date: (r.d instanceof Date ? r.d : new Date(r.d as string)).toISOString().slice(0, 10),
    count: Number(r.c),
  }));
}

async function sessionMetrics(since: Date): Promise<{
  sessionsWithEvents: number;
  avgEventsPerSession: number | null;
  bounceRate: number | null;
  avgDurationSeconds: number | null;
  sessionsPerDay: Array<{ date: string; count: number }>;
}> {
  const perDay = await prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
    SELECT (DATE_TRUNC('day', "firstSeenAt" AT TIME ZONE 'UTC'))::date AS d, COUNT(*)::bigint AS c
    FROM "analytics_sessions"
    WHERE "firstSeenAt" >= ${since}
    GROUP BY 1 ORDER BY 1
  `;

  const eventAgg = await prisma.$queryRaw<
    Array<{ sessions: bigint; avg_ev: number | null; bounce: number | null }>
  >`
    WITH ev AS (
      SELECT "sessionId", COUNT(*)::bigint AS n
      FROM "analytics_events"
      WHERE "sessionId" IS NOT NULL AND "createdAt" >= ${since}
      GROUP BY "sessionId"
    )
    SELECT
      COUNT(*)::bigint AS sessions,
      AVG(n::double precision) AS avg_ev,
      (COUNT(*) FILTER (WHERE n = 1)::double precision / NULLIF(COUNT(*), 0)) AS bounce
    FROM ev
  `;

  const durationRow = await prisma.$queryRaw<Array<{ avg_sec: number | null }>>`
    SELECT AVG(EXTRACT(EPOCH FROM ("mx" - "mn")))::double precision AS avg_sec
    FROM (
      SELECT "sessionId", MIN("createdAt") AS mn, MAX("createdAt") AS mx
      FROM "analytics_events"
      WHERE "sessionId" IS NOT NULL AND "createdAt" >= ${since}
      GROUP BY "sessionId"
      HAVING COUNT(*) > 1
    ) x
  `;

  const row = eventAgg[0];
  return {
    sessionsWithEvents: Number(row?.sessions ?? 0),
    avgEventsPerSession: row?.avg_ev != null ? row.avg_ev : null,
    bounceRate: row?.bounce != null ? row.bounce : null,
    avgDurationSeconds: durationRow[0]?.avg_sec ?? null,
    sessionsPerDay: perDay.map((r) => ({
      date: (r.d instanceof Date ? r.d : new Date(r.d as string)).toISOString().slice(0, 10),
      count: Number(r.c),
    })),
  };
}

export async function buildAdminControlCenterPayload(): Promise<Record<string, unknown>> {
  const startToday = utcDayStart();
  const start7 = daysAgoUtc(7);
  const start30 = daysAgoUtc(30);

  const anyEvents = await hasAnyAnalyticsEvents();

  const [
    activeListings,
    pendingListings,
    totalUsers,
    reportsOpen,
    messages24h,
    revenueTodayAgg,
    revenue7Agg,
    revenue30Agg,
    promotedActive,
    reportsByStatus,
    modApprovedToday,
    modRejectedToday,
    modQueuePending,
    audit,
    funnelRows,
    sessionFunnelRows,
    topListingsViews,
    topByConversion,
    topUsersActivity,
    topCategories,
    highVolumeUsers,
    ipClusters,
    promotionBuyers30,
    viewers30,
  ] = await Promise.all([
    prisma.listing.count({ where: { status: "active" } }),
    prisma.listing.count({ where: { status: "pending" } }),
    prisma.user.count(),
    prisma.report.count({ where: { status: ReportStatus.pending } }),
    prisma.message.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.succeeded, paidAt: { gte: startToday } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.succeeded, paidAt: { gte: start7 } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.succeeded, paidAt: { gte: start30 } },
      _sum: { amount: true },
    }),
    prisma.listing.count({
      where: {
        isPromoted: true,
        OR: [{ promotionExpiresAt: null }, { promotionExpiresAt: { gt: new Date() } }],
      },
    }),
    prisma.report.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.listing.count({
      where: { moderationStatus: "approved", moderatedAt: { gte: startToday } },
    }),
    prisma.listing.count({
      where: { moderationStatus: "rejected", moderatedAt: { gte: startToday } },
    }),
    prisma.moderationQueue.count({ where: { status: "pending" } }),
    getAuditLogs({ limit: 25, offset: 0 }),
    prisma.$queryRaw<Array<{ views: bigint; contacts: bigint; messages: bigint }>>`
      SELECT
        COUNT(*) FILTER (WHERE "eventType" = ${ANALYTICS_EVENT.listing_view})::bigint AS views,
        COUNT(*) FILTER (WHERE "eventType" = ${ANALYTICS_EVENT.listing_contact_click})::bigint AS contacts,
        COUNT(*) FILTER (WHERE "eventType" = ${ANALYTICS_EVENT.message_sent})::bigint AS messages
      FROM "analytics_events"
      WHERE "createdAt" >= ${start30}
    `,
    prisma.$queryRaw<
      Array<{
        with_view: bigint;
        view_and_contact: bigint;
        view_and_message: bigint;
        contact_and_message: bigint;
      }>
    >`
      WITH f AS (
        SELECT "sessionId",
          BOOL_OR("eventType" = ${ANALYTICS_EVENT.listing_view}) AS v,
          BOOL_OR("eventType" = ${ANALYTICS_EVENT.listing_contact_click}) AS c,
          BOOL_OR("eventType" = ${ANALYTICS_EVENT.message_sent}) AS m
        FROM "analytics_events"
        WHERE "sessionId" IS NOT NULL AND "createdAt" >= ${start30}
        GROUP BY "sessionId"
      )
      SELECT
        COUNT(*) FILTER (WHERE v)::bigint AS with_view,
        COUNT(*) FILTER (WHERE v AND c)::bigint AS view_and_contact,
        COUNT(*) FILTER (WHERE v AND m)::bigint AS view_and_message,
        COUNT(*) FILTER (WHERE c AND m)::bigint AS contact_and_message
      FROM f
    `,
    prisma.listing.findMany({
      where: { status: "active" },
      orderBy: { views: "desc" },
      take: 15,
      select: { id: true, title: true, views: true, category: true, ownerUserId: true },
    }),
    prisma.$queryRaw<
      Array<{
        listingId: string;
        views: bigint;
        contacts: bigint;
        messages: bigint;
        title: string | null;
        category: string | null;
      }>
    >`
      SELECT e."listingId",
        COUNT(*) FILTER (WHERE e."eventType" = 'listing_view')::bigint AS views,
        COUNT(*) FILTER (WHERE e."eventType" = 'listing_contact_click')::bigint AS contacts,
        COUNT(*) FILTER (WHERE e."eventType" = 'message_sent')::bigint AS messages,
        MAX(l."title") AS title,
        MAX(l."category") AS category
      FROM "analytics_events" e
      LEFT JOIN "listings" l ON l.id = e."listingId"
      WHERE e."listingId" IS NOT NULL
        AND e."createdAt" >= ${start30}
      GROUP BY e."listingId"
      HAVING COUNT(*) FILTER (WHERE e."eventType" = 'listing_view') > 0
      ORDER BY (COUNT(*) FILTER (WHERE e."eventType" = 'listing_contact_click')::float
        / NULLIF(COUNT(*) FILTER (WHERE e."eventType" = 'listing_view'), 0)) DESC NULLS LAST
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ userId: string; c: bigint }>>`
      SELECT "userId", COUNT(*)::bigint AS c
      FROM "analytics_events"
      WHERE "userId" IS NOT NULL AND "createdAt" >= ${start30}
      GROUP BY "userId"
      ORDER BY c DESC
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ category: string; c: bigint }>>`
      SELECT l."category", COUNT(*)::bigint AS c
      FROM "analytics_events" e
      INNER JOIN "listings" l ON l.id = e."listingId"
      WHERE e."createdAt" >= ${start30}
      GROUP BY l."category"
      ORDER BY c DESC
      LIMIT 12
    `,
    prisma.$queryRaw<Array<{ userId: string; msg: bigint; lst: bigint }>>`
      SELECT u.id AS "userId",
        (SELECT COUNT(*)::bigint FROM "messages" m WHERE m."senderId" = u.id AND m."createdAt" >= ${start30}) AS msg,
        (SELECT COUNT(*)::bigint FROM "listings" l2 WHERE l2."ownerUserId" = u.id AND l2."createdAt" >= ${start30}) AS lst
      FROM "users" u
      ORDER BY (
        (SELECT COUNT(*) FROM "messages" m WHERE m."senderId" = u.id AND m."createdAt" >= ${start30}) +
        (SELECT COUNT(*) FROM "listings" l2 WHERE l2."ownerUserId" = u.id AND l2."createdAt" >= ${start30}) * 2
      ) DESC
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ ipHash: string; users: bigint; events: bigint }>>`
      SELECT s2."ipHash",
        COUNT(DISTINCT s2."userId")::bigint AS users,
        COUNT(e.id)::bigint AS events
      FROM "analytics_sessions" s2
      LEFT JOIN "analytics_events" e ON e."sessionId" = s2.id AND e."createdAt" >= ${start30}
      WHERE s2."ipHash" IS NOT NULL AND s2."firstSeenAt" >= ${start30}
      GROUP BY s2."ipHash"
      HAVING COUNT(DISTINCT s2."userId") >= 3
      ORDER BY COUNT(e.id) DESC
      LIMIT 20
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT "userId")::bigint AS n
      FROM "analytics_events"
      WHERE "eventType" = ${ANALYTICS_EVENT.promotion_purchased}
        AND "userId" IS NOT NULL
        AND "createdAt" >= ${start30}
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT "userId")::bigint AS n
      FROM "analytics_events"
      WHERE "eventType" = ${ANALYTICS_EVENT.listing_view}
        AND "userId" IS NOT NULL
        AND "createdAt" >= ${start30}
    `,
  ]);

  const payers30 = Number(promotionBuyers30[0]?.n ?? 0);
  const distinctViewers30 = Number(viewers30[0]?.n ?? 0);

  const funnel = funnelRows[0] ?? { views: BigInt(0), contacts: BigInt(0), messages: BigInt(0) };
  const v = Number(funnel.views);
  const c = Number(funnel.contacts);
  const m = Number(funnel.messages);

  const sf = sessionFunnelRows[0] ?? {
    with_view: BigInt(0),
    view_and_contact: BigInt(0),
    view_and_message: BigInt(0),
    contact_and_message: BigInt(0),
  };
  const sv = Number(sf.with_view);
  const svc = Number(sf.view_and_contact);
  const svm = Number(sf.view_and_message);
  const scm = Number(sf.contact_and_message);

  const funnelByCategoryRows = await prisma.$queryRaw<
    Array<{ category: string; views: bigint; contacts: bigint; messages: bigint }>
  >`
    SELECT l."category",
      COUNT(*) FILTER (WHERE e."eventType" = ${ANALYTICS_EVENT.listing_view})::bigint AS views,
      COUNT(*) FILTER (WHERE e."eventType" = ${ANALYTICS_EVENT.listing_contact_click})::bigint AS contacts,
      COUNT(*) FILTER (WHERE e."eventType" = ${ANALYTICS_EVENT.message_sent})::bigint AS messages
    FROM "analytics_events" e
    INNER JOIN "listings" l ON l.id = e."listingId"
    WHERE e."listingId" IS NOT NULL AND e."createdAt" >= ${start30}
    GROUP BY l."category"
    HAVING COUNT(*) FILTER (WHERE e."eventType" = ${ANALYTICS_EVENT.listing_view}) > 0
    ORDER BY views DESC
    LIMIT 30
  `;

  const paidUsers30 = await prisma.payment.groupBy({
    by: ["userId"],
    where: { status: PaymentStatus.succeeded, paidAt: { gte: start30 } },
    _count: { id: true },
  });
  const distinctPayingUsers = paidUsers30.length;

  const revenue30Minor = revenue30Agg._sum.amount ?? 0;
  const avgRevenuePerPayingUser30 =
    distinctPayingUsers > 0 ? revenue30Minor / distinctPayingUsers : null;

  const userIdsTop = [
    ...new Set([
      ...topUsersActivity.map((r) => r.userId).filter(Boolean),
      ...highVolumeUsers.map((r) => r.userId).filter(Boolean),
    ]),
  ];
  const userEmails = await prisma.user.findMany({
    where: { id: { in: userIdsTop } },
    select: { id: true, email: true, name: true, isBanned: true, failedLoginAttempts: true },
  });
  const userMap = new Map(userEmails.map((u) => [u.id, u]));

  const reportTargets = await prisma.$queryRaw<Array<{ ownerUserId: string; cnt: bigint }>>`
    SELECT l."ownerUserId", COUNT(*)::bigint AS cnt
    FROM "reports" r
    INNER JOIN "listings" l ON l.id = r."listingId"
    WHERE r."createdAt" >= ${start30}
    GROUP BY l."ownerUserId"
    HAVING COUNT(*) >= 2
    ORDER BY cnt DESC
    LIMIT 20
  `;

  const suspiciousUsers = await buildSuspiciousUsers(highVolumeUsers, reportTargets);

  const [
    trends7Listings,
    trends7Messages,
    trends7Views,
    trends7Users,
    trends30Listings,
    trends30Messages,
    trends30Views,
    trends30Users,
    sessions7,
    sessions30,
  ] = await Promise.all([
    dailySeries("listings", start7),
    dailySeries("messages", start7),
    dailyEventSeries(ANALYTICS_EVENT.listing_view, start7),
    dailySeries("users", start7),
    dailySeries("listings", start30),
    dailySeries("messages", start30),
    dailyEventSeries(ANALYTICS_EVENT.listing_view, start30),
    dailySeries("users", start30),
    sessionMetrics(start7),
    sessionMetrics(start30),
  ]);

  const [
    validation,
    alerts,
    integrity,
    liveAnalyticsEvents,
    promotionPayments,
  ] = await Promise.all([
    runAnalyticsMetricsValidation({}),
    computeAnalyticsAlerts(),
    countAnalyticsOrphans(),
    prisma.analyticsEvent.findMany({
      take: 45,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        listingId: true,
        userId: true,
        sessionId: true,
        listing: { select: { title: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.succeeded,
        purpose: { in: ["promote_listing", "promotion"] },
        paidAt: { not: null },
      },
      orderBy: { paidAt: "desc" },
      take: 35,
      select: {
        id: true,
        amount: true,
        currency: true,
        paidAt: true,
        purpose: true,
        metadata: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const listingIdsFromPayments = new Set<string>();
  for (const p of promotionPayments) {
    const m = p.metadata as Record<string, unknown> | null;
    if (m && typeof m.listingId === "string") listingIdsFromPayments.add(m.listingId);
  }
  const listingRowsForPayments =
    listingIdsFromPayments.size > 0
      ? await prisma.listing.findMany({
          where: { id: { in: [...listingIdsFromPayments] } },
          select: {
            id: true,
            title: true,
            isPromoted: true,
            promotionExpiresAt: true,
          },
        })
      : [];
  const listingById = new Map(listingRowsForPayments.map((l) => [l.id, l]));
  const nowUtc = new Date();

  const revenueUnified = promotionPayments.map((p) => {
    const m = p.metadata as Record<string, unknown> | null;
    const listingId = m && typeof m.listingId === "string" ? m.listingId : null;
    const l = listingId ? listingById.get(listingId) : undefined;
    const listingPromotionActive =
      listingId && l
        ? Boolean(l.isPromoted) &&
          (l.promotionExpiresAt === null || l.promotionExpiresAt > nowUtc)
        : null;
    return {
      paymentId: p.id,
      amountMinorUnits: p.amount,
      currency: p.currency,
      paidAt: p.paidAt?.toISOString() ?? null,
      purpose: p.purpose,
      payerEmail: p.user.email,
      listingId,
      listingTitle: l?.title ?? null,
      listingPromotionActive,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    dataAvailability: {
      hasAnalyticsEvents: anyEvents,
    },
    kpi: {
      activeListings,
      pendingListings,
      totalUsers,
      reportsOpen,
      messagesSent24h: messages24h,
      revenueTodayMinorUnits: revenueTodayAgg._sum.amount ?? 0,
      revenue7dMinorUnits: revenue7Agg._sum.amount ?? 0,
      revenue30dMinorUnits: revenue30Minor,
      currency: "RON",
    },
    trends: {
      last7Days: {
        listingsCreated: trends7Listings,
        messages: trends7Messages,
        listingViews: trends7Views,
        usersRegistered: trends7Users,
      },
      last30Days: {
        listingsCreated: trends30Listings,
        messages: trends30Messages,
        listingViews: trends30Views,
        usersRegistered: trends30Users,
      },
    },
    sessions: {
      last7Days: sessions7,
      last30Days: sessions30,
    },
    funnel: {
      eventTotalsLast30d: {
        listingViews: v,
        listingContactClicks: c,
        messagesSent: m,
        viewToContactRate: v > 0 ? c / v : null,
        viewToMessageRate: v > 0 ? m / v : null,
        contactToMessageRate: c > 0 ? m / c : null,
      },
      sessionBasedLast30d: {
        sessionsWithListingView: sv,
        sessionsViewThenContact: svc,
        sessionsViewThenMessage: svm,
        sessionsContactThenMessage: scm,
        sessionViewToContactRate: sv > 0 ? svc / sv : null,
        sessionViewToMessageRate: sv > 0 ? svm / sv : null,
        sessionContactToMessageRate: svc > 0 ? scm / svc : null,
      },
      topListingsByConversion: topByConversion.map((r) => ({
        listingId: r.listingId,
        title: r.title,
        category: r.category,
        views: Number(r.views),
        contacts: Number(r.contacts),
        messages: Number(r.messages),
        contactPerView: Number(r.views) > 0 ? Number(r.contacts) / Number(r.views) : null,
        messagePerView: Number(r.views) > 0 ? Number(r.messages) / Number(r.views) : null,
      })),
      byCategoryLast30d: funnelByCategoryRows.map((r) => {
        const views = Number(r.views);
        const contacts = Number(r.contacts);
        const messages = Number(r.messages);
        return {
          category: r.category,
          listingViews: views,
          contactClicks: contacts,
          messagesSent: messages,
          viewToContactRate: views > 0 ? contacts / views : null,
          viewToMessageRate: views > 0 ? messages / views : null,
          contactToMessageRate: contacts > 0 ? messages / contacts : null,
        };
      }),
    },
    top: {
      listingsByViews: topListingsViews,
      usersByEventCount: topUsersActivity.map((row) => ({
        userId: row.userId,
        eventCount: Number(row.c),
        email: userMap.get(row.userId)?.email ?? null,
        name: userMap.get(row.userId)?.name ?? null,
      })),
      categoriesByEngagement: topCategories.map((r) => ({
        category: r.category,
        eventCount: Number(r.c),
      })),
    },
    moderation: {
      pendingListings,
      moderationQueuePending: modQueuePending,
      rejectedToday: modRejectedToday,
      approvedToday: modApprovedToday,
      reportsByStatus: reportsByStatus.map((x) => ({
        status: x.status,
        count: x._count.id,
      })),
    },
    suspicious: {
      highVolumeUsers: highVolumeUsers.map((r) => ({
        userId: r.userId,
        messagesLast30d: Number(r.msg),
        listingsCreatedLast30d: Number(r.lst),
        email: userMap.get(r.userId)?.email ?? null,
      })),
      usersWithRepeatedReportsOnListings: reportTargets.map((r) => ({
        ownerUserId: r.ownerUserId,
        reportCount: Number(r.cnt),
      })),
      sharedIpClusters: ipClusters.map((r) => ({
        ipHashPrefix: (r.ipHash || "").slice(0, 12) + "…",
        distinctUsers: Number(r.users),
        eventCount: Number(r.events),
      })),
      riskUsers: suspiciousUsers,
    },
    revenue: {
      todayMinorUnits: revenueTodayAgg._sum.amount ?? 0,
      last7dMinorUnits: revenue7Agg._sum.amount ?? 0,
      last30dMinorUnits: revenue30Minor,
      avgPerPayingUserLast30dMinorUnits: avgRevenuePerPayingUser30,
      distinctPayingUsersLast30d: distinctPayingUsers,
      activePromotedListings: promotedActive,
      promotionBuyersLast30d: payers30,
      distinctListingViewersLast30d: distinctViewers30,
      promotionBuyerToViewerRate30d:
        distinctViewers30 > 0 ? payers30 / distinctViewers30 : null,
    },
    activityFeed: audit.logs.map((log: any) => ({
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      userEmail: log.user?.email ?? null,
    })),
    validation: {
      thresholdPercent: 5,
      anyExceeded: validation.anyExceeded,
      checks: validation.checks,
    },
    alerts,
    integrity,
    liveAnalyticsEvents: liveAnalyticsEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      listingId: e.listingId,
      listingTitle: e.listing?.title ?? null,
      userId: e.userId,
      userEmail: e.user?.email ?? null,
      sessionIdPrefix: e.sessionId ? `${e.sessionId.slice(0, 10)}…` : null,
    })),
    revenueUnified,
  };
}

type RiskLevel = "low" | "medium" | "high";

async function buildSuspiciousUsers(
  highVolume: Array<{ userId: string; msg: bigint; lst: bigint }>,
  reportTargets: Array<{ ownerUserId: string; cnt: bigint }>
): Promise<
  Array<{
    userId: string;
    email: string | null;
    riskScore: number;
    riskLevel: RiskLevel;
    signals: string[];
  }>
> {
  const scores = new Map<string, { score: number; signals: string[] }>();

  const add = (userId: string, delta: number, signal: string) => {
    const cur = scores.get(userId) ?? { score: 0, signals: [] };
    cur.score += delta;
    cur.signals.push(signal);
    scores.set(userId, cur);
  };

  for (const r of highVolume) {
    if (Number(r.msg) > 80) add(r.userId, 25, "high_message_volume_30d");
    if (Number(r.lst) > 15) add(r.userId, 30, "high_listing_creation_30d");
    if (Number(r.msg) > 40 && Number(r.msg) <= 80) add(r.userId, 12, "elevated_message_volume_30d");
    if (Number(r.lst) > 8 && Number(r.lst) <= 15) add(r.userId, 15, "elevated_listing_creation_30d");
  }

  for (const r of reportTargets) {
    const n = Number(r.cnt);
    if (n >= 5) add(r.ownerUserId, 35, "many_reports_on_owned_listings_30d");
    else if (n >= 3) add(r.ownerUserId, 20, "repeated_reports_on_owned_listings_30d");
  }

  const flaggedUsers = await prisma.user.findMany({
    where: {
      OR: [{ failedLoginAttempts: { gte: 8 } }, { isBanned: true }],
    },
    select: { id: true, failedLoginAttempts: true, isBanned: true },
  });
  for (const u of flaggedUsers) {
    if (u.isBanned) add(u.id, 40, "account_banned");
    if (u.failedLoginAttempts >= 8) add(u.id, 15, "high_failed_login_attempts");
  }

  const level = (s: number): RiskLevel =>
    s >= 55 ? "high" : s >= 25 ? "medium" : "low";

  const entries = [...scores.entries()]
    .filter(([, v]) => v.score >= 25)
    .map(([userId, v]) => ({
      userId,
      riskScore: Math.min(100, v.score),
      riskLevel: level(v.score),
      signals: v.signals,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 40);

  const ids = entries.map((e) => e.userId);
  const emails = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true },
  });
  const em = new Map(emails.map((x) => [x.id, x.email]));

  return entries.map((e) => ({ ...e, email: em.get(e.userId) ?? null }));
}
