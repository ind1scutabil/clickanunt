/**
 * Liveness — minimal checks for load balancers (no auth, no secrets).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";
import { withTimeout } from "@/lib/stability/with-timeout";
import { logApiRouteError } from "@/lib/observability/api-route-error";
import {
  getHealthOpsSnapshot,
  isProductionHealthOpsEnabled,
} from "@/lib/infra/health-ops-snapshot";

function getAppVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function measureDbLatencyMs(): Promise<number> {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return Date.now() - start;
}

async function measureRedis(): Promise<{
  status: "skipped" | "up" | "down";
  latencyMs?: number;
}> {
  if (!process.env.REDIS_URL?.trim()) {
    return { status: "skipped" };
  }
  const start = Date.now();
  try {
    const redis = getRedisClient();
    await redis.ping();
    return { status: "up", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const version = getAppVersion();
  const timestamp = new Date().toISOString();

  try {
    if (process.env.USE_IN_MEMORY_DB === "true") {
      return NextResponse.json({
        status: "ok",
        mode: "memory",
        version,
        timestamp,
      });
    }

    const [dbLatencyMs, redis] = await Promise.all([
      measureDbLatencyMs(),
      measureRedis(),
    ]);

    const body: Record<string, unknown> = {
      status: "ok",
      database: { up: true, latencyMs: dbLatencyMs },
      version,
      timestamp,
    };
    if (redis.status !== "skipped") {
      body.redis = redis;
    }

    if (isProductionHealthOpsEnabled()) {
      const ops = getHealthOpsSnapshot({
        includeDisk: true,
        includeUploadsDir: true,
        includeTemp: true,
      });
      body.ops = ops;
      if (ops.warnings.length > 0) {
        body.warnings = ops.warnings;
      }
    }

    if (dbLatencyMs > 2000) {
      body.warnings = [...(Array.isArray(body.warnings) ? body.warnings : []), "db_latency_high"];
    }

    if (process.env.ENABLE_STAGING_LOAD_DIAGNOSTICS === "1") {
      const t0 = Date.now();
      const diagTimeoutMs = Number(process.env.HEALTH_DIAGNOSTICS_TIMEOUT_MS ?? 5000);
      try {
        const activeListingsCount = await withTimeout(
          prisma.listing.count({
            where: { status: "active", deletedAt: null },
          }),
          diagTimeoutMs,
          "health.activeListingsCount"
        );
        const diagnostics: Record<string, unknown> = {
          activeListingsCount,
          activeListingsCountMs: Date.now() - t0,
        };
        try {
          const connRows = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT count(*)::bigint AS count FROM pg_stat_activity
            WHERE datname = current_database()
          `;
          diagnostics.dbConnections = Number(connRows[0]?.count ?? 0);
        } catch {
          diagnostics.dbConnections = null;
        }
        body.diagnostics = diagnostics;
      } catch (diagErr) {
        body.diagnostics = {
          activeListingsCount: null,
          activeListingsCountMs: Date.now() - t0,
          error: "diagnostics_timeout_or_failed",
        };
        logApiRouteError("Health diagnostics failed", diagErr, {
          route: "/api/health",
          method: "GET",
          code: "health_diagnostics",
        });
      }
    }

    return NextResponse.json(body);
  } catch (error) {
    logApiRouteError("Health liveness failed", error, {
      route: "/api/health",
      method: "GET",
      code: "health_liveness",
    });
    return NextResponse.json(
      {
        status: "error",
        database: { up: false },
        version,
        timestamp,
      },
      { status: 503 }
    );
  }
}
