import { NextRequest } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/messages-request-auth";
import { subscribeUser } from "@/lib/messaging-sse-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

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

  const state = { cleanup: null as (() => void) | null };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      const unsubscribe = subscribeUser(userId, send);

      send({ type: "connected", userId });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);

      state.cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      state.cleanup?.();
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
