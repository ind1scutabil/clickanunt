import { NextRequest, NextResponse } from "next/server";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/unread-count
 * Lightweight: total unread messages for current user (navbar badge).
 * Avoids loading full conversation list.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getMessagingApiAuthPayload(request);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId || (payload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    console.error("[unread-count]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
