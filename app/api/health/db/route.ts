/**
 * API Route: Database Health Check
 * Checks database connectivity and returns detailed status
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  const startTime = Date.now();
  
  let dbStatus = 'disconnected';
  let dbError = null;
  let queryTime = 0;
  
  try {
    const queryStart = Date.now();
    // Lightweight query to test connection
    await prisma.$queryRaw`SELECT 1 as health`;
    queryTime = Date.now() - queryStart;
    dbStatus = 'connected';
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Database health check failed');
  }
  
  const responseTime = Date.now() - startTime;
  
  // Return 503 if database is not reachable
  if (dbStatus !== 'connected') {
    return NextResponse.json(
      {
        status: 'error',
        db: dbStatus,
        error: dbError,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
  
  const health = {
    status: 'ok',
    db: dbStatus,
    queryTime: `${queryTime}ms`,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
  };

  // Warn if query is slow
  if (queryTime > 100) {
    logger.warn({ queryTime }, 'Slow database query detected');
  }
  
  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
