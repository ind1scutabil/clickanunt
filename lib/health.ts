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
 * Check Redis connectivity (optional) - Not currently used
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _checkRedis(): Promise<HealthCheck> {
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

  // Determine overall status: healthy only if database AND storage are up
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (database.status === 'down') {
    status = 'unhealthy';
  } else if (storage.status === 'down') {
    status = 'degraded';
  }
  // Storage being "local" (up) doesn't degrade the status

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
