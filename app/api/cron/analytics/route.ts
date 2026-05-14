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

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processAnalyticsQueueBatch(500);

  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  await rollupAnalyticsDailyForDate(y);

  const rules = await runAdminNotificationRules(prisma);

  return NextResponse.json({
    ok: true,
    queueProcessed: processed,
    rollupUtcDay: y.toISOString().slice(0, 10),
    adminRulesCreated: rules.created,
  });
}
