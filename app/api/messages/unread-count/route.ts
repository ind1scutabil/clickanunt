import { NextRequest, NextResponse } from "next/server";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import { prisma } from "@/lib/prisma";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";
import { promObserveUnreadFetch } from "@/lib/messaging-prometheus";

/**
 * GET /api/messages/unread-count
 * Lightweight: total unread messages for current user (navbar badge).
 * Avoids loading full conversation list.
 */
export async function GET(request: NextRequest) {
  const corr = messagingRequestCorrelation(request);
  const t0 = Date.now();
  try {
    const payload = await getMessagingApiAuthPayload(request);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId || (payload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    /** Aliniază cu `Message.receiverId` / participanții conversație (UUID canonical lowercase). */
    const viewerCanon =
      canonicalMessagingUserId(userId) ?? String(userId).trim().toLowerCase();

    const count = await prisma.message.count({
      where: {
        receiverId: viewerCanon,
        isRead: false,
      },
    });

    const durationMs = Date.now() - t0;
    promObserveUnreadFetch(durationMs);
    messagingStructuredLog("unread_sync", {
      requestId: corr.requestId,
      userId: viewerCanon,
      unreadCount: count,
      durationMs,
    });

    return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    console.error("[unread-count]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
