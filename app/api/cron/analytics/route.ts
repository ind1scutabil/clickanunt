/**
 * Drain analytics queue + daily rollup for prior UTC day.
 * Authorization: Bearer CRON_SECRET or x-cron-secret header.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAnalyticsQueueBatch } from "@/lib/analytics-queue-persist";
import { rollupAnalyticsDailyForDate } from "@/lib/analytics-daily-rollup";
import { runAdminNotificationRules } from "@/lib/admin-notification-rules";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  const startedAt = Date.now();
  const processed = await processAnalyticsQueueBatch(500);

  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  await rollupAnalyticsDailyForDate(y);

  const rules = await runAdminNotificationRules(prisma);

  logger.info("cron.analytics", {
    queueProcessed: processed,
    adminRulesCreated: rules.created,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({
    ok: true,
    queueProcessed: processed,
    rollupUtcDay: y.toISOString().slice(0, 10),
    adminRulesCreated: rules.created,
  });
}
