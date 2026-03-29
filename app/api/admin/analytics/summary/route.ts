/**
 * GET /api/admin/analytics/summary
 * Agregări reale din DB + analytics_events (fără date simulate).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { PaymentStatus, ReportStatus } from "@prisma/client";
import { getAuditLogs } from "@/lib/audit";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";

function utcStartOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgoUtc(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (
      !user ||
      (!hasPermission(user.role as UserRole, Permission.ANALYTICS_VIEW) &&
        !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL))
    ) {
      // Unauthenticated or unauthorized: 403 JSON — not HTML 404. If you see 404 for this path,
      // the deploy likely lacks this route or a proxy is misconfigured.
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const startToday = utcStartOfToday();
    const start7d = daysAgoUtc(7);
    const start30d = daysAgoUtc(30);

    const [
      usersTotal,
      usersNewToday,
      usersNew7d,
      usersNew30d,
      listingsActive,
      listingsPendingStatus,
      listingsNewToday,
      listingsNew7d,
      listingsNew30d,
      moderationQueuePending,
      reportsPending,
      reportsInvestigating,
      reportsResolved,
      reportsDismissed,
      messagesToday,
      messages7d,
      messages30d,
      favoritesToday,
      favorites7d,
      favorites30d,
      viewsEventToday,
      viewsEvent7d,
      viewsEvent30d,
      promotedActive,
      paymentsPromoSucceeded30d,
      paymentSumPromo30d,
      listingsModeratedApprovedToday,
      listingsModeratedRejectedToday,
      scamSuspectedListings,
      usersHighFailedLogin,
      topCategories,
      topListings,
      topSendersRaw,
      recentAudit,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startToday } } }),
      prisma.user.count({ where: { createdAt: { gte: start7d } } }),
      prisma.user.count({ where: { createdAt: { gte: start30d } } }),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { status: "pending" } }),
      prisma.listing.count({ where: { createdAt: { gte: startToday } } }),
      prisma.listing.count({ where: { createdAt: { gte: start7d } } }),
      prisma.listing.count({ where: { createdAt: { gte: start30d } } }),
      prisma.moderationQueue.count({ where: { status: "pending" } }),
      prisma.report.count({ where: { status: ReportStatus.pending } }),
      prisma.report.count({ where: { status: ReportStatus.investigating } }),
      prisma.report.count({ where: { status: ReportStatus.resolved } }),
      prisma.report.count({ where: { status: ReportStatus.dismissed } }),
      prisma.message.count({ where: { createdAt: { gte: startToday } } }),
      prisma.message.count({ where: { createdAt: { gte: start7d } } }),
      prisma.message.count({ where: { createdAt: { gte: start30d } } }),
      prisma.favorite.count({ where: { createdAt: { gte: startToday } } }),
      prisma.favorite.count({ where: { createdAt: { gte: start7d } } }),
      prisma.favorite.count({ where: { createdAt: { gte: start30d } } }),
      prisma.analyticsEvent.count({
        where: {
          eventType: ANALYTICS_EVENT.listing_view,
          createdAt: { gte: startToday },
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          eventType: ANALYTICS_EVENT.listing_view,
          createdAt: { gte: start7d },
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          eventType: ANALYTICS_EVENT.listing_view,
          createdAt: { gte: start30d },
        },
      }),
      prisma.listing.count({
        where: {
          isPromoted: true,
          OR: [{ promotionExpiresAt: null }, { promotionExpiresAt: { gt: new Date() } }],
        },
      }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.succeeded,
          paidAt: { gte: start30d },
          purpose: { in: ["promote_listing", "promotion"] },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.succeeded,
          paidAt: { gte: start30d },
          purpose: { in: ["promote_listing", "promotion"] },
        },
        _sum: { amount: true },
      }),
      prisma.listing.count({
        where: {
          moderationStatus: "approved",
          moderatedAt: { gte: startToday },
        },
      }),
      prisma.listing.count({
        where: {
          moderationStatus: "rejected",
          moderatedAt: { gte: startToday },
        },
      }),
      prisma.listing.count({
        where: { isScamSuspected: true, status: { notIn: ["deleted"] } },
      }),
      prisma.user.count({ where: { failedLoginAttempts: { gte: 5 } } }),
      prisma.listing.groupBy({
        by: ["category"],
        where: { status: "active" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.listing.findMany({
        where: { status: "active" },
        orderBy: { views: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          views: true,
          category: true,
          ownerUserId: true,
        },
      }),
      prisma.$queryRaw<Array<{ senderId: string; c: bigint }>>`
        SELECT "senderId", COUNT(*)::bigint AS c
        FROM "messages"
        WHERE "createdAt" >= ${start30d}
        GROUP BY "senderId"
        ORDER BY c DESC
        LIMIT 10
      `,
      getAuditLogs({ limit: 15, offset: 0 }),
    ]);

    const senderIds = topSendersRaw.map((r) => r.senderId).filter(Boolean);
    const senders =
      senderIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, email: true, name: true },
          })
        : [];
    const senderMap = new Map(senders.map((u) => [u.id, u]));

    const topUsersByMessages = topSendersRaw.map((row) => {
      const u = senderMap.get(row.senderId);
      return {
        userId: row.senderId,
        messageCount: Number(row.c),
        email: u?.email ?? null,
        name: u?.name ?? null,
      };
    });

    const auditLogsSanitized = recentAudit.logs.map((log: any) => ({
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      userId: log.userId,
      userEmail: log.user?.email ?? null,
      userRole: log.user?.role ?? null,
    }));

    const revenueMinorUnits = paymentSumPromo30d._sum.amount ?? 0;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      users: {
        total: usersTotal,
        newToday: usersNewToday,
        newLast7d: usersNew7d,
        newLast30d: usersNew30d,
      },
      listings: {
        active: listingsActive,
        pendingApproval: listingsPendingStatus,
        moderationQueuePending,
        newToday: listingsNewToday,
        newLast7d: listingsNew7d,
        newLast30d: listingsNew30d,
        moderatedApprovedToday: listingsModeratedApprovedToday,
        moderatedRejectedToday: listingsModeratedRejectedToday,
      },
      reports: {
        pending: reportsPending,
        investigating: reportsInvestigating,
        resolved: reportsResolved,
        dismissed: reportsDismissed,
      },
      engagement: {
        messagesToday,
        messagesLast7d: messages7d,
        messagesLast30d: messages30d,
        favoritesToday,
        favoritesLast7d: favorites7d,
        favoritesLast30d: favorites30d,
        listingViewsEventsToday: viewsEventToday,
        listingViewsEventsLast7d: viewsEvent7d,
        listingViewsEventsLast30d: viewsEvent30d,
      },
      promotions: {
        activePromotedListings: promotedActive,
        promotionPaymentsSucceededLast30d: paymentsPromoSucceeded30d,
        promotionRevenueLast30dMinorUnits: revenueMinorUnits,
        currency: "RON",
      },
      risk: {
        scamSuspectedListings,
        usersWithHighFailedLogins: usersHighFailedLogin,
      },
      topCategories: topCategories.map((r) => ({
        category: r.category,
        count: r._count.id,
      })),
      topListingsByViews: topListings.map((l) => ({
        id: l.id,
        title: l.title,
        views: l.views,
        category: l.category,
        ownerUserId: l.ownerUserId,
      })),
      topUsersByMessagesLast30d: topUsersByMessages,
      recentAuditLogs: auditLogsSanitized,
      notes: {
        listingViewsEngagement:
          "Vizualizările din această secțiune sunt evenimente `listing_view` înregistrate după activarea jurnalului. Totalul pe anunț rămâne în câmpul `listings.views`.",
        adminActions:
          "Acțiunile administrative recente provin din `audit_logs` (sursă imuabilă).",
      },
    });
  } catch (e) {
    console.error("admin analytics summary error", e);
    return NextResponse.json(
      { error: "Eroare la agregări analitice" },
      { status: 500 }
    );
  }
}
