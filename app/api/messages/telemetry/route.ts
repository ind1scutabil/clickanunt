import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";
import { promObserveClientReconnectTelemetry } from "@/lib/messaging-prometheus";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    kind: z.enum(["sse_reconnect", "sse_transport_ended"]),
    correlationId: z.string().uuid().optional(),
  })
  .strict();

/**
 * Raport lightweight din browser pentru reconectări SSE (Bearer, fără CSRF pentru API JSON).
 */
const handler = async (request: NextRequest): Promise<NextResponse> => {
  const corr = messagingRequestCorrelation(request);
  const payload = await getMessagingApiAuthPayload(request);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const viewerCanon =
    canonicalMessagingUserId(payload.userId) ?? String(payload.userId).trim().toLowerCase();

  messagingStructuredLog("reconnect", {
    requestId: corr.requestId,
    userId: viewerCanon,
    reconnectKind: parsed.data.kind,
    clientCorrelationId: parsed.data.correlationId ?? null,
  });

  promObserveClientReconnectTelemetry();

  return NextResponse.json({ accepted: true }, { status: 202 });
};

export const POST = withRateLimit(handler, RATE_LIMITS.API);
