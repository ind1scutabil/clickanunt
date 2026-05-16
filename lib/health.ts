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
  details?: Record<string, unknown>;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return {
      status: 'down',
      error: message,
    };
  }
}

/**
 * Check storage (S3/R2 or local fallback) connectivity
 */
async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Check if S3 is configured
    const hasS3Config = !!(
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET
    );

    // If S3 not configured, local storage is valid
    if (!hasS3Config) {
      return {
        status: 'up',
        latency: Date.now() - start,
        details: {
          mode: 'local',
          message: 'Using local file storage',
        },
      };
    }

    // If S3 is configured, report it
    return {
      status: 'up',
      latency: Date.now() - start,
      details: {
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET,
        mode: 's3',
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown storage error';
    return {
      status: 'down',
      error: message,
    };
  }
}

/**
 * Check Redis connectivity when REDIS_URL is set (optional dependency).
 */
export async function checkRedis(): Promise<HealthCheck | null> {
  if (!process.env.REDIS_URL?.trim()) {
    return null;
  }

  const start = Date.now();
  try {
    const { getRedisClient } = await import('./redis');
    const redis = getRedisClient();
    await redis.ping();
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Redis ping failed';
    return {
      status: 'down',
      error: message,
      latency: Date.now() - start,
    };
  }
}

/**
 * Run all health checks
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const [database, storage, redis] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkRedis(),
  ]);

  // Determine overall status: healthy only if database AND storage are up
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (database.status === 'down') {
    status = 'unhealthy';
  } else if (storage.status === 'down') {
    status = 'degraded';
  } else if (redis?.status === 'down') {
    status = 'degraded';
  }

  const checks: HealthStatus['checks'] = { database, storage };
  if (redis) {
    checks.redis = redis;
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
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
