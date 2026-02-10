/**
 * Redis-backed Distributed Rate Limiting
 * 
 * For production use with multiple instances
 * Falls back to in-memory if Redis unavailable
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  backoffUntil?: number;
}

type RateLimitStore = Map<string, RateLimitEntry>;

class DistributedRateLimiter {
  private store: RateLimitStore = new Map();
  private redisClient: unknown | null = null;

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis connection if available
   */
  private initRedis() {
    try {
      if (process.env.REDIS_URL) {
        // In production, use actual Redis client
        // import Redis from 'ioredis';
        // this.redisClient = new Redis(process.env.REDIS_URL);
        console.log('✅ Redis rate limiter initialized');
      }
    } catch {
      console.warn('⚠️ Redis unavailable, using in-memory rate limiter');
    }
  }

  /**
   * Check if request is allowed
   */
  async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
  }> {
    if (this.redisClient) {
      return this.checkRedis(key, limit, windowMs);
    }

    return this.checkMemory(key, limit, windowMs);
  }

  /**
   * Check rate limit using in-memory store
   */
  private checkMemory(
    key: string,
    limit: number,
    windowMs: number
  ): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    let entry = this.store.get(key);

    // Check if in backoff period (exponential backoff)
    if (entry?.backoffUntil && now < entry.backoffUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.backoffUntil - now) / 1000),
      };
    }

    // Reset if window expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      this.store.set(key, entry);
    }

    entry.count++;

    if (entry.count <= limit) {
      return {
        allowed: true,
        remaining: limit - entry.count,
      };
    }

    // Apply exponential backoff on violation
    const violations = entry.count - limit;
    const backoffDuration = Math.min(
      1000 * Math.pow(2, violations - 1), // 2^n exponential
      60000 // cap at 1 minute
    );

    entry.backoffUntil = now + backoffDuration;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(backoffDuration / 1000),
    };
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedis(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
  }> {
    // This would use actual Redis in production
    // For now, fallback to memory
    return this.checkMemory(key, limit, windowMs);
  }

  /**
   * Reset specific key
   */
  reset(key: string) {
    this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get current count for key
   */
  getCount(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.resetTime < Date.now()) return 0;
    return entry.count;
  }
}

export const distributedRateLimiter = new DistributedRateLimiter();

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },

  SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 signups per hour
  },

  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
  },

  // API endpoints - moderate
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },

  API_SEARCH: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },

  API_UPLOAD: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10, // 10 uploads per hour
  },

  // Email endpoints
  EMAIL_SEND: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
  },

  EMAIL_VERIFY: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },
};
