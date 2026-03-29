/**
 * GET /api/admin/analytics/live — lightweight recent analytics_events for polling.
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
    if (
      !user ||
      (!hasPermission(user.role as UserRole, Permission.ANALYTICS_VIEW) &&
        !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL))
    ) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const limit = Math.min(
      60,
      Math.max(5, Number(new URL(request.url).searchParams.get("limit")) || 30)
    );

    const rows = await prisma.analyticsEvent.findMany({
      take: limit,
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
    });

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      events: rows.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
        listingId: e.listingId,
        listingTitle: e.listing?.title ?? null,
        userId: e.userId,
        userEmail: e.user?.email ?? null,
        sessionIdPrefix: e.sessionId ? `${e.sessionId.slice(0, 10)}…` : null,
      })),
    });
  } catch (e) {
    console.error("admin analytics live error", e);
    return NextResponse.json({ error: "Eroare" }, { status: 500 });
  }
}
