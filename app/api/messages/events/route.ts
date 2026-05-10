import { NextRequest } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/messages-request-auth";
import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import { subscribeUser } from "@/lib/messaging-sse-hub";
import {
  sseClientConnected,
  sseClientDisconnected,
  sseHeartbeatSent,
} from "@/lib/messaging-sse-metrics";
import { MESSAGING_SSE_PROTOCOL_VERSION } from "@/lib/messaging-event-schema";
import { logger } from "@/lib/observability";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";
import { promObserveSseDisconnect } from "@/lib/messaging-prometheus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const HEARTBEAT_MS = 25_000;

/**
 * GET /api/messages/events?token=JWT
 * Server-Sent Events: push când apare un mesaj nou (expeditor + destinatar).
 * EventSource nu trimite header Authorization — folosim token în query (același JWT ca în localStorage).
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserIdFromRequest(request);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const viewerCanonRaw = userId.trim();
  const viewerCanon =
    canonicalMessagingUserId(viewerCanonRaw) ?? viewerCanonRaw.toLowerCase();

  const corr = messagingRequestCorrelation(request);

  const state = { cleanup: null as (() => void) | null, disposed: false };

  const finalize = () => {
    if (state.disposed) return;
    state.disposed = true;
    state.cleanup?.();
    messagingStructuredLog("sse_disconnect", {
      requestId: corr.requestId,
      userId: viewerCanon,
    });
    promObserveSseDisconnect();
    state.cleanup = null;
  };

  request.signal.addEventListener("abort", finalize);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      sseClientConnected();
      messagingStructuredLog("sse_connect", {
        requestId: corr.requestId,
        userId: viewerCanon,
      });
      logger.debug("messaging.sse.stream_started", {
        userIdSuffix: viewerCanon.slice(0, 8),
      });

      const send = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      const unsubscribe = subscribeUser(viewerCanon, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
          const hb = { type: "heartbeat", ts: Date.now() } as const;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(hb)}\n\n`)
          );
          sseHeartbeatSent();
        } catch {
          /* closed */
        }
      }, HEARTBEAT_MS);

      state.cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        sseClientDisconnected();
      };

      send({
        type: "connected",
        userId: viewerCanon,
        protocol: MESSAGING_SSE_PROTOCOL_VERSION,
      });
    },
    cancel() {
      finalize();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
