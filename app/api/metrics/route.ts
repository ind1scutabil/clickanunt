/**
 * API Route: Metrics (Prometheus format)
 * Exposes basic application metrics
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple in-memory metrics store
const metrics = {
  requests: new Map<string, number>(),
  errors: new Map<string, number>(),
  latencies: new Map<string, number[]>(),
  startTime: Date.now(),
};

export function recordMetric(route: string, duration: number, status: number) {
  // Count requests
  const reqKey = `${route}_${status >= 400 ? 'error' : 'success'}`;
  metrics.requests.set(reqKey, (metrics.requests.get(reqKey) || 0) + 1);
  
  // Track latencies for p95 calculation
  if (!metrics.latencies.has(route)) {
    metrics.latencies.set(route, []);
  }
  const latencies = metrics.latencies.get(route)!;
  latencies.push(duration);
  
  // Keep only last 1000 samples per route
  if (latencies.length > 1000) {
    latencies.shift();
  }
}

function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index];
}

export async function GET() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  
  let dbConnections = 0;
  try {
    // Get active connections (PostgreSQL specific)
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    dbConnections = Number(result[0]?.count || 0);
  } catch (error) {
    // Ignore if query fails
  }
  
  // Build Prometheus text format
  const lines: string[] = [];
  
  // Uptime
  lines.push('# HELP app_uptime_seconds Application uptime in seconds');
  lines.push('# TYPE app_uptime_seconds counter');
  lines.push(`app_uptime_seconds ${uptime}`);
  lines.push('');
  
  // Requests
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of metrics.requests.entries()) {
    const [route, status] = key.split('_');
    lines.push(`http_requests_total{route="${route}",status="${status}"} ${count}`);
  }
  lines.push('');
  
  // Latencies (p95)
  lines.push('# HELP http_request_duration_p95_ms Request duration 95th percentile in milliseconds');
  lines.push('# TYPE http_request_duration_p95_ms gauge');
  for (const [route, latencies] of metrics.latencies.entries()) {
    const p95 = calculateP95(latencies);
    lines.push(`http_request_duration_p95_ms{route="${route}"} ${p95.toFixed(2)}`);
  }
  lines.push('');
  
  // Database connections
  lines.push('# HELP db_connections_active Active database connections');
  lines.push('# TYPE db_connections_active gauge');
  lines.push(`db_connections_active ${dbConnections}`);
  lines.push('');
  
  // Memory usage
  const memUsage = process.memoryUsage();
  lines.push('# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes');
  lines.push('# TYPE nodejs_memory_usage_bytes gauge');
  lines.push(`nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
  lines.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
  lines.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
  lines.push('');
  
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
