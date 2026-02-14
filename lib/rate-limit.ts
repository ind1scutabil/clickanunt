/**
 * Production-Grade Rate Limiting
 * Supports both Redis (distributed) and in-memory (single instance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// In-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

// Preset configurations
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
  },
  
  // Create/edit endpoints
  CREATE: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 creates per minute
    message: 'Too many requests, please slow down',
  },
  
  // Search endpoints
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please wait',
  },
  
  // General API
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Rate limit exceeded, please try again later',
  },
} as const;

/**
 * Default key generator (IP + User-Agent)
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const route = new URL(req.url).pathname;
  
  return `${route}:${ip}:${userAgent.substring(0, 50)}`;
}

/**
 * Rate limiter middleware
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const key = config.keyGenerator ? config.keyGenerator(req) : defaultKeyGenerator(req);
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment counter
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > config.max) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    
    logger.warn({
      type: 'security',
      event: 'rate_limit',
      ip,
      details: {
        key,
        count: entry.count,
        max: config.max,
        route: new URL(req.url).pathname,
      },
    }, 'Rate limit exceeded');
    
    return NextResponse.json(
      {
        error: config.message || 'Too many requests',
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
        },
      }
    );
  }
  
  // Add rate limit headers to response
  const remaining = config.max - entry.count;
  
  return null; // No rate limit hit, continue
}

/**
 * Rate limit wrapper for API routes
 */
export function withRateLimit<T>(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(req, config);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const response = await handler(req, ...args);
    
    // Add rate limit headers to successful responses
    const key = config.keyGenerator ? config.keyGenerator(req) : defaultKeyGenerator(req);
    const entry = rateLimitStore.get(key);
    
    if (entry) {
      const remaining = Math.max(0, config.max - entry.count);
      response.headers.set('X-RateLimit-Limit', config.max.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    }
    
    return response;
  };
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug({ cleaned }, 'Rate limit store cleanup completed');
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Redis-ready rate limiter (for future use)
 * Uncomment when Redis is available
 */
/*
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function rateLimitRedis(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const key = `ratelimit:${config.keyGenerator ? config.keyGenerator(req) : defaultKeyGenerator(req)}`;
  
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
  }
  
  if (count > config.max) {
    const ttl = await redis.ttl(key);
    
    return NextResponse.json(
      { error: config.message || 'Too many requests', retryAfter: ttl },
      {
        status: 429,
        headers: { 'Retry-After': ttl.toString() },
      }
    );
  }
  
  return null;
}
*/
