import { NextRequest, NextResponse } from "next/server";
import { getMessagingSseMetricsSnapshot } from "@/lib/messaging-sse-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — metrici per-proces SSE/messaging Redis (în spatele unui secret; fără expunere publică implicită).
 *
 * Headers: x-messaging-metrics-secret: ${MESSAGING_METRICS_SECRET}
 */
export async function GET(request: NextRequest) {
  const secret = process.env.MESSAGING_METRICS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Messaging metrics endpoint disabled (missing MESSAGING_METRICS_SECRET)" },
      { status: 503 }
    );
  }
  const hdr = request.headers.get("x-messaging-metrics-secret");
  if (hdr !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getMessagingSseMetricsSnapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
