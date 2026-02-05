/**
 * API Route: Health Check
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { performHealthCheck, checkLiveness, checkReadiness } from "@/lib/health";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    // Liveness probe (simple DB ping)
    if (type === 'live') {
      const isAlive = await checkLiveness();
      return NextResponse.json(
        { status: isAlive ? 'ok' : 'error' },
        { status: isAlive ? 200 : 503 }
      );
    }

    // Readiness probe (all systems operational)
    if (type === 'ready') {
      const isReady = await checkReadiness();
      return NextResponse.json(
        { status: isReady ? 'ready' : 'not_ready' },
        { status: isReady ? 200 : 503 }
      );
    }

    // Full health check
    const health = await performHealthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
