export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireAllExpiredPromotions } from "@/lib/expire-listing-promotions";
import { logger } from "@/lib/observability";

async function run() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "in-memory-db" });
  }

  const { updated } = await expireAllExpiredPromotions(prisma);
  logger.info("cron.expire-promotions", { updated });
  return NextResponse.json({ ok: true, updated });
}

function authorizeCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET nu este configurat" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  try {
    return await run();
  } catch (e) {
    logger.error("cron.expire-promotions failed", e);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  try {
    return await run();
  } catch (e) {
    logger.error("cron.expire-promotions failed", e);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
