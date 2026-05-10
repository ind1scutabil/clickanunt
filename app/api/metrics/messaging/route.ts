/**
 * Prometheus scrape dedicat mesageriei (subset metrici Grafana-ready).
 */

import { NextRequest, NextResponse } from "next/server";
import { metricsMessagingPrometheusText } from "@/lib/messaging-prometheus";

export const runtime = "nodejs";

function authorized(request: NextRequest): boolean {
  const token = process.env.INTERNAL_METRICS_TOKEN?.trim();
  if (!token) return true;
  return request.headers.get("x-internal-metrics-token") === token;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const lines = await metricsMessagingPrometheusText();
  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8; version=0.0.4",
      "Cache-Control": "no-store",
    },
  });
}
