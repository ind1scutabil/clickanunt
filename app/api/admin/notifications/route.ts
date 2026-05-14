export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { canAccessAdminNotifications } from "@/lib/admin-notification-access";

function isMissingAdminNotificationsTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function buildWhere(
  filter: string | null
): Prisma.AdminNotificationWhereInput {
  const f = (filter || "all").toLowerCase();
  if (f === "unread") return { readAt: null };
  if (f === "critical") return { severity: "critical" };
  if (f === "payments") return { type: { startsWith: "payment." } };
  if (f === "users")
    return {
      OR: [
        { type: { startsWith: "user." } },
        { entityType: "user" },
      ],
    };
  if (f === "listings")
    return {
      OR: [
        { type: { startsWith: "listing." } },
        { type: { startsWith: "promotion." } },
        { entityType: "listing" },
      ],
    };
  if (f === "reports")
    return {
      OR: [{ type: { startsWith: "report." } }],
    };
  return {};
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  const countsOnly = searchParams.get("countsOnly") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  try {
    const user = await getUserFromRequest(request);
    if (!user || !canAccessAdminNotifications(user.role as UserRole)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const extra = buildWhere(filter);

    try {
      const [unreadCount, criticalUnreadCount] = await Promise.all([
        prisma.adminNotification.count({ where: { readAt: null } }),
        prisma.adminNotification.count({
          where: { readAt: null, severity: "critical" },
        }),
      ]);

      if (countsOnly) {
        return NextResponse.json({
          success: true,
          unreadCount,
          criticalUnreadCount,
        });
      }

      const [notifications, total] = await Promise.all([
        prisma.adminNotification.findMany({
          where: extra,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.adminNotification.count({ where: extra }),
      ]);

      return NextResponse.json({
        success: true,
        notifications,
        total,
        limit,
        offset,
        unreadCount,
        criticalUnreadCount,
      });
    } catch (inner) {
      if (isMissingAdminNotificationsTable(inner)) {
        if (countsOnly) {
          return NextResponse.json({
            success: true,
            unreadCount: 0,
            criticalUnreadCount: 0,
            degraded: true,
          });
        }
        return NextResponse.json({
          success: true,
          notifications: [],
          total: 0,
          limit,
          offset,
          unreadCount: 0,
          criticalUnreadCount: 0,
          degraded: true,
        });
      }
      throw inner;
    }
  } catch (error) {
    console.error("[admin/notifications]", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea notificărilor" },
      { status: 500 }
    );
  }
}
