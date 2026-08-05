export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/notifications?limit=25&offset=0
 * In-app notifications (UserNotification rows) for the authenticated caller only.
 * Cookie-first via getUserFromRequest (Bearer still accepted for mobile).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const [rows, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.userNotification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    const notifications = rows.map((n) => ({
      id: n.id,
      userId: n.userId,
      broadcastId: n.broadcastId,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { notifications, unreadCount },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("GET /api/notifications", e);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
