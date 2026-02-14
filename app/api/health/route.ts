/**
 * API Route: Health Check - Production Grade
 * Basic health check (app is up)
 * Use /api/health/db for database connectivity check
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const startTime = Date.now();
  
  const health = {
    status: 'ok',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${Date.now() - startTime}ms`,
  };

  logger.debug({ health }, 'Health check requested');
  
  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
