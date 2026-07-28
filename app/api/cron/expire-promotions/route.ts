export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireAllExpiredPromotions } from "@/lib/expire-listing-promotions";
import { logger } from "@/lib/observability";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import { authorizeCronRequest } from "@/lib/cron-auth";

async function run() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "in-memory-db" });
  }

  const startedAt = Date.now();
  const { updated } = await expireAllExpiredPromotions(prisma);
  logger.info("cron.expire-promotions", {
    updated,
    durationMs: Date.now() - startedAt,
  });

  if (updated > 0) {
    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.PROMOTION_EXPIRED_BATCH,
      severity: AdminNotificationSeverity.info,
      title: "Promovări expirate",
      message: `${updated} promovări au fost expirate automat de cron.`,
      metadata: { updated },
    });
  }

  return NextResponse.json({ ok: true, updated });
}

export async function GET(request: NextRequest) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;
  try {
    return await run();
  } catch (e) {
    logger.error("cron.expire-promotions failed", e);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;
  try {
    return await run();
  } catch (e) {
    logger.error("cron.expire-promotions failed", e);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
