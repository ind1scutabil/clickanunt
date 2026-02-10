/**
 * API Route: Health Check - Enterprise Level
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { performHealthCheck, checkLiveness, checkReadiness } from "@/lib/health";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    // Liveness probe (simple DB ping)
    if (type === 'live') {
      const isAlive = await checkLiveness();
      return NextResponse.json(
        { status: isAlive ? 'ok' : 'error', mode: db.isUsingInMemory() ? 'in-memory' : 'database' },
        { status: isAlive ? 200 : 503 }
      );
    }

    // Readiness probe (all systems operational)
    if (type === 'ready') {
      const isReady = await checkReadiness();
      return NextResponse.json(
        { status: isReady ? 'ready' : 'not_ready', mode: db.isUsingInMemory() ? 'in-memory' : 'database' },
        { status: isReady ? 200 : 503 }
      );
    }

    // Full health check
    const health = await performHealthCheck();
    
    // Add database mode
    const dbHealth = db.getHealthStatus();
    (health as any).database = {
      status: dbHealth.healthy ? 'up' : 'down',
      mode: dbHealth.mode,
      message: dbHealth.mode === 'in-memory' 
        ? 'Using in-memory database (PostgreSQL not available)' 
        : 'Connected to PostgreSQL',
    };
    
    // Enterprise: healthy if at least one database mode works
    if (health.status === 'unhealthy' && dbHealth.mode === 'in-memory') {
      health.status = 'degraded';
      (health as any).message = 'Running in development mode with in-memory database';
    }
    
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        mode: db.isUsingInMemory() ? 'in-memory' : 'database',
      },
      { status: 503 }
    );
  }
}
