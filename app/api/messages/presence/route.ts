import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messagingPresenceSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";
import { canonicalMessagingUserId, messagingUserIdsEqual } from "@/lib/messaging-user-id";
import { messagingPublishSse } from "@/lib/messaging-sse-hub";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENCE_TTL_SEC = 180;
const PRESENCE_PREFIX = process.env.MESSAGING_PRESENCE_KEY_PREFIX ?? "ca:presence:user:";

async function redisSetPresence(userIdCanon: string, online: boolean): Promise<void> {
  try {
    const r = getRedisClient();
    const key = `${PRESENCE_PREFIX}${userIdCanon}`;
    if (online) {
      await r.setex(key, PRESENCE_TTL_SEC, String(Date.now()));
    } else {
      await r.del(key);
    }
  } catch {
    /* degraded */
  }
}

/**
 * POST /api/messages/presence — TTL în Redis + notificare opțională către counterpart din conversație.
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
      schema: messagingPresenceSchema,
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

    const { conversationId, online } = security.data as {
      conversationId?: string;
      online: boolean;
    };

    await redisSetPresence(viewerCanon, online);

    messagingStructuredLog("presence", {
      requestId: corr.requestId,
      userId: viewerCanon,
      conversationId: conversationId ?? null,
      online,
    });

    if (online && conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          participant1Id: true,
          participant2Id: true,
          listingId: true,
        },
      });
      if (conv) {
        const isP1 = messagingUserIdsEqual(conv.participant1Id, viewerCanon);
        const isP2 = messagingUserIdsEqual(conv.participant2Id, viewerCanon);
        if (isP1 || isP2) {
          const peerId = isP1 ? conv.participant2Id : conv.participant1Id;
          messagingPublishSse([peerId], "presence", {
            type: "presence",
            state: online ? "online" : "offline",
            conversationId,
            listingId: conv.listingId ?? null,
            userId: viewerCanon,
          });
        }
      }
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    console.error("[presence]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
