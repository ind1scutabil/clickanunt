/**
 * Diagnostics mesagerie — necesită permisiune system health (admin cluster).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission, userHasPermission } from "@/lib/rbac";
import { getMessagingSseMetricsSnapshot } from "@/lib/messaging-sse-metrics";
import { messagingNodeId } from "@/lib/messaging-observability";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

const PRESENCE_PREFIX = process.env.MESSAGING_PRESENCE_KEY_PREFIX ?? "ca:presence:user:";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
    });
    if (!userHasPermission(user, Permission.SYSTEM_HEALTH_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since24h = new Date(Date.now() - 86400_000);
    const staleUnreadCutoff = new Date(Date.now() - 3600_000);

    const [
      conversationsActive24h,
      unreadDelayedOver1h,
      recentConversations,
    ] = await Promise.all([
      prisma.conversation.count({
        where: { lastMessageAt: { gte: since24h } },
      }),
      prisma.message.count({
        where: {
          isRead: false,
          createdAt: { lt: staleUnreadCutoff },
        },
      }),
      prisma.conversation.findMany({
        orderBy: { lastMessageAt: "desc" },
        take: 20,
        select: {
          id: true,
          lastMessageAt: true,
          listingId: true,
          participant1Id: true,
          participant2Id: true,
        },
      }),
    ]);

    let redisLatencyMs: number | null = null;
    let redisReachable = false;
    try {
      const r = getRedisClient();
      const t0 = Date.now();
      const pong = await r.ping();
      redisLatencyMs = Date.now() - t0;
      redisReachable = pong === "PONG";
    } catch {
      redisReachable = false;
    }

    let presenceApprox = 0;
    try {
      const r = getRedisClient();
      const pattern = `${PRESENCE_PREFIX}*`;
      let cursor = "0";
      let rounds = 0;
      do {
        const [next, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 400);
        cursor = next;
        presenceApprox += keys.length;
        rounds++;
      } while (cursor !== "0" && rounds < 40 && presenceApprox < 50_000);
    } catch {
      presenceApprox = -1;
    }

    const metrics = getMessagingSseMetricsSnapshot();

    return NextResponse.json(
      {
        nodeId: messagingNodeId(),
        generatedAt: new Date().toISOString(),
        note: "Metrici SSE = doar pentru acest proces Node.",
        sse: metrics,
        redis: {
          reachable: redisReachable,
          latencyMs: redisLatencyMs,
        },
        counts: {
          conversationsWithTrafficLast24h: conversationsActive24h,
          onlineUsersPresenceKeysApprox:
            presenceApprox < 0 ? null : presenceApprox,
          unreadMessagesOlderThan1hStaleFlag: unreadDelayedOver1h,
          failedRedisPublishesTotal: metrics.redisPublishFailures,
          sseHandlerDispatchErrorsTotal: metrics.sseHandlerDispatchErrors,
        },
        recentConversations,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
