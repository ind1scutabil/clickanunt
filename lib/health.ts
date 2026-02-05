/**
 * Health Check System
 * Verifică status-ul componentelor critice
 */

import { prisma } from './prisma';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    storage: HealthCheck;
    redis?: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

/**
 * Check storage (S3/R2) connectivity
 */
async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Basic check - just verify env vars exist
    const hasS3Config = !!(
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET
    );

    if (!hasS3Config) {
      return {
        status: 'down',
        error: 'S3 configuration missing',
      };
    }

    // TODO: Actual S3 ping test
    return {
      status: 'up',
      latency: Date.now() - start,
      details: {
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET,
      },
    };
  } catch (error: any) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

/**
 * Check Redis connectivity (optional)
 */
async function checkRedis(): Promise<HealthCheck> {
  // TODO: Implement actual Redis check when integrated
  if (!process.env.REDIS_URL) {
    return {
      status: 'down',
      error: 'Redis not configured (using memory fallback)',
    };
  }

  return {
    status: 'up',
    details: {
      note: 'Redis check not implemented yet',
    },
  };
}

/**
 * Run all health checks
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const [database, storage] = await Promise.all([
    checkDatabase(),
    checkStorage(),
  ]);

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (database.status === 'down') {
    status = 'unhealthy';
  } else if (storage.status === 'down') {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database,
      storage,
    },
  };
}

/**
 * Quick liveness check (for load balancer)
 */
export async function checkLiveness(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Readiness check (all systems operational)
 */
export async function checkReadiness(): Promise<boolean> {
  const health = await performHealthCheck();
  return health.status !== 'unhealthy';
}
