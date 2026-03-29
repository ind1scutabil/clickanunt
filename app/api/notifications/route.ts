export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/notifications?limit=25&offset=0
 * In-app notifications (UserNotification rows).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      (tokenPayload as { userId?: string; sub?: string }).userId ||
      (tokenPayload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const rows = await prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

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
      { notifications },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("GET /api/notifications", e);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
