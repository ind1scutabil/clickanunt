/**
 * Liveness — minimal checks for load balancers (no auth).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (process.env.USE_IN_MEMORY_DB === "true") {
      return NextResponse.json({
        status: "ok",
        mode: "memory",
        timestamp: new Date().toISOString(),
      });
    }
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
