import { NextRequest, NextResponse } from "next/server";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messagingTypingSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";
import { canonicalMessagingUserId, messagingUserIdsEqual } from "@/lib/messaging-user-id";
import { messagingPublishSse } from "@/lib/messaging-sse-hub";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/messages/typing — ephemeral typing indicator (participant-only validation).
 */
export async function POST(request: NextRequest) {
  const corr = messagingRequestCorrelation(request);
  try {
    const payload = await getMessagingApiAuthPayload(request);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "messages",
      schema: messagingTypingSchema,
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const viewerCanon =
      canonicalMessagingUserId(payload.userId) ?? String(payload.userId).trim().toLowerCase();

    const { conversationId, typing } = security.data as {
      conversationId: string;
      typing: boolean;
    };

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participant1Id: true,
        participant2Id: true,
        listingId: true,
      },
    });
    if (!conv) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isP1 = messagingUserIdsEqual(conv.participant1Id, viewerCanon);
    const isP2 = messagingUserIdsEqual(conv.participant2Id, viewerCanon);
    if (!isP1 && !isP2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const peerId = isP1 ? conv.participant2Id : conv.participant1Id;

    messagingPublishSse([peerId], "typing", {
      type: "typing",
      conversationId,
      listingId: conv.listingId ?? null,
      userId: viewerCanon,
      typing,
    });

    messagingStructuredLog("typing", {
      requestId: corr.requestId,
      userId: viewerCanon,
      conversationId,
      typing,
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    console.error("[typing]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
