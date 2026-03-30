/**
 * Liveness — minimal checks for load balancers (no auth).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAppVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function GET() {
  const version = getAppVersion();
  try {
    if (process.env.USE_IN_MEMORY_DB === "true") {
      return NextResponse.json({
        status: "ok",
        mode: "memory",
        version,
        timestamp: new Date().toISOString(),
      });
    }
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        version,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
