/**
 * Metrics Dashboard API
 * GET /api/admin/metrics/dashboard
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { metricsCollector } from "@/lib/metrics";
import { alertManager } from "@/lib/alerts";
import { SLOs } from "@/lib/slo";
import { Permission } from "@/lib/rbac";
import { requireAdminApiPermission } from "@/lib/admin-api-auth";

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminApiPermission(
      request,
      Permission.SYSTEM_HEALTH_VIEW
    );
    if (!gate.ok) return gate.response;

    const metrics = metricsCollector.getMetrics();
    const alerts = alertManager.getAlertSummary();

    const dashboard = {
      timestamp: new Date(metrics.timestamp).toISOString(),
      slos: {
        availability: {
          current: (metrics.availability * 100).toFixed(3) + "%",
          target: (SLOs.AVAILABILITY.target * 100).toFixed(3) + "%",
          status:
            metrics.availability >= SLOs.AVAILABILITY.target ? "ok" : "breach",
        },
        errorRate: {
          current: (metrics.errorRate * 100).toFixed(3) + "%",
          target: ((1 - SLOs.ERROR_RATE.target) * 100).toFixed(3) + "%",
          status:
            metrics.errorRate <= 1 - SLOs.ERROR_RATE.target ? "ok" : "breach",
        },
        p95Latency: {
          current: metrics.latency.p95.toFixed(2) + "ms",
          target: SLOs.P95_LATENCY.target + "ms",
          status:
            metrics.latency.p95 <= SLOs.P95_LATENCY.target ? "ok" : "breach",
        },
      },
      latency: {
        p50: metrics.latency.p50.toFixed(2) + "ms",
        p95: metrics.latency.p95.toFixed(2) + "ms",
        p99: metrics.latency.p99.toFixed(2) + "ms",
        mean: metrics.latency.mean.toFixed(2) + "ms",
      },
      requests: {
        total: metrics.requests.total,
        successful: metrics.requests.successful,
        failed: metrics.requests.failed,
        errorRate: (metrics.errorRate * 100).toFixed(2) + "%",
      },
      alerts: {
        summary: alerts,
        active: alertManager.getActiveAlerts().slice(0, 10),
      },
      health: {
        status: metrics.errorRate < 0.05 ? "healthy" : "degraded",
      },
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
