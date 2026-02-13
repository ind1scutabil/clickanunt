/**
 * API Route: Health Check - Enterprise Level
 * Returns application health status including database connectivity
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const startTime = Date.now();
  
  let dbStatus = 'disconnected';
  let dbError = null;
  
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HEALTH CHECK] Database connection failed:', error);
  }
  
  const responseTime = Date.now() - startTime;
  
  // Fail if database is not reachable
  if (dbStatus !== 'connected') {
    return NextResponse.json(
      {
        status: 'error',
        db: dbStatus,
        error: dbError,
        version: process.env.APP_VERSION || 'unknown',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
      },
      { status: 503 } // Service Unavailable
    );
  }
  
  return NextResponse.json(
    {
      status: 'ok',
      db: dbStatus,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks: {
        database: '✓',
        server: '✓',
      },
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
