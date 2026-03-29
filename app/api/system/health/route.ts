/**
 * Detailed health — DB latency, optional Redis, analytics queue depth (RBAC).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasPermission(user.role as UserRole, Permission.SYSTEM_HEALTH_VIEW)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const t0 = Date.now();
    let dbOk = false;
    let dbLatencyMs: number | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
      dbLatencyMs = Date.now() - t0;
    } catch {
      dbOk = false;
    }

    let redis: "up" | "down" | "skipped" = "skipped";
    if (process.env.REDIS_URL) {
      try {
        const { getRedisClient } = await import("@/lib/redis");
        const r = getRedisClient();
        const pong = await r.ping();
        redis = pong === "PONG" ? "up" : "down";
      } catch {
        redis = "down";
      }
    }

    let analyticsQueueDepth: number | null = null;
    try {
      analyticsQueueDepth = await prisma.analyticsEventQueue.count();
    } catch {
      analyticsQueueDepth = null;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: { ok: dbOk, latencyMs: dbLatencyMs },
      redis,
      analyticsQueueDepth,
    });
  } catch (e) {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
