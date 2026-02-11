/**
 * PHASE 2: Enhanced Rate Limiting with User & IP tracking
 * Supports: Login, Posting, Messaging, Search endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  userId?: string; // Track by user ID if authenticated
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

const store: RateLimitStore = {};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in ms
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  limit: number;
}

/**
 * Core rate limiting function
 * Tracks by IP + optional userId
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Initialize or retrieve bucket
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key].resetTime,
      limit: config.maxRequests,
    };
  }

  const entry = store[key];

  // Check if window expired
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + config.windowMs;
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Increment counter
  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    limit: config.maxRequests,
  };
}

/**
 * Combined IP + User rate limiter
 * More sophisticated tracking for authenticated requests
 */
export function combinedRateLimit(
  ip: string,
  userId: string | null,
  endpoint: 'login' | 'posting' | 'messaging' | 'search',
  config: RateLimitConfig
): RateLimitResult {
  // Always rate limit by IP
  const ipKey = `ip:${endpoint}:${ip}`;
  const ipResult = rateLimit(ipKey, config);

  // If user authenticated, apply stricter per-user limit
  if (userId) {
    const userKey = `user:${endpoint}:${userId}`;
    const userResult = rateLimit(userKey, {
      ...config,
      maxRequests: Math.ceil(config.maxRequests * 1.5), // Users get 50% more generous limits
    });

    // Return most restrictive result
    if (!ipResult.allowed || !userResult.allowed) {
      return {
        allowed: false,
        remaining: Math.min(ipResult.remaining, userResult.remaining),
        resetTime: Math.max(ipResult.resetTime, userResult.resetTime),
        retryAfter: Math.max(ipResult.retryAfter || 0, userResult.retryAfter || 0),
        limit: config.maxRequests,
      };
    }
  }

  return ipResult;
}

/**
 * Preset configurations for different endpoints
 */
export const rateLimitPresets = {
  // Login: 5 attempts per 15 minutes (strict)
  login: (ip: string) =>
    combinedRateLimit(ip, null, 'login', {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    }),

  // Posting: 10 listings per hour per IP, 20 per user per hour
  posting: (ip: string, userId?: string) =>
    combinedRateLimit(ip, userId || null, 'posting', {
      windowMs: 60 * 60 * 1000,
      maxRequests: userId ? 20 : 10,
    }),

  // Messaging: 30 messages per 10 minutes
  messaging: (ip: string, userId?: string) =>
    combinedRateLimit(ip, userId || null, 'messaging', {
      windowMs: 10 * 60 * 1000,
      maxRequests: 30,
    }),

  // Search: 100 queries per minute (generous for search)
  search: (ip: string) =>
    combinedRateLimit(ip, null, 'search', {
      windowMs: 60 * 1000,
      maxRequests: 100,
    }),

  // API general: 500 requests per hour
  api: (ip: string) =>
    combinedRateLimit(ip, null, 'search', {
      windowMs: 60 * 60 * 1000,
      maxRequests: 500,
    }),
};

/**
 * Reset rate limit (for admin/testing)
 */
export function resetRateLimit(identifier: string): void {
  delete store[identifier];
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
  return store[identifier] || null;
}

/**
 * Clear all rate limits (testing only)
 */
export function clearAllLimits(): void {
  Object.keys(store).forEach((key) => {
    delete store[key];
  });
}
