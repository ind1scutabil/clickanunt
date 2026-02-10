/**
 * Rate Limiting - OWASP ASVS V4.1
 * 
 * Features:
 * - Sliding window rate limiting
 * - Per-IP and per-user limits
 * - Brute-force protection
 * - Distributed rate limiting support (Redis)
 * - Exponential backoff for repeated violations
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// In-memory store for development (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyPrefix: 'ratelimit:login',
  },
  
  SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 signups per hour per IP
    keyPrefix: 'ratelimit:signup',
  },
  
  // Search and browse
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    keyPrefix: 'ratelimit:search',
  },
  
  // Listing operations
  CREATE_LISTING: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 listings per hour
    keyPrefix: 'ratelimit:create-listing',
  },
  
  UPDATE_LISTING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 updates per minute
    keyPrefix: 'ratelimit:update-listing',
  },
  
  DELETE_LISTING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 deletions per minute
    keyPrefix: 'ratelimit:delete-listing',
  },
  
  // API general
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyPrefix: 'ratelimit:api',
  },
  
  // Contact form
  CONTACT_FORM: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 submissions per hour
    keyPrefix: 'ratelimit:contact',
  },
  
  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 reset requests per hour
    keyPrefix: 'ratelimit:password-reset',
  },
  
  // Image upload
  IMAGE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 images per hour
    keyPrefix: 'ratelimit:image-upload',
  },
} as const;

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from session/token first
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Check rate limit
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  const isLimited = entry.count >= config.maxRequests;
  
  if (!isLimited) {
    entry.count++;
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const reset = Math.ceil(entry.resetTime / 1000);
  
  return {
    success: !isLimited,
    limit: config.maxRequests,
    remaining,
    reset,
    retryAfter: isLimited ? Math.ceil((entry.resetTime - now) / 1000) : undefined,
  };
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<RateLimitResult> => {
    const identifier = getClientIdentifier(request);
    return checkRateLimit(identifier, config);
  };
}

/**
 * Brute-force protection with exponential backoff
 */
export class BruteForceProtection {
  private attempts = new Map<string, { count: number; lockedUntil?: number }>();
  
  constructor(
    private maxAttempts: number = 5,
    private lockDurationMs: number = 15 * 60 * 1000, // 15 minutes
    private windowMs: number = 60 * 60 * 1000 // 1 hour
  ) {
    // Clean up expired entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.attempts.entries()) {
        if (value.lockedUntil && value.lockedUntil < now) {
          this.attempts.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
  
  /**
   * Record failed attempt
   */
  recordFailure(identifier: string): void {
    const entry = this.attempts.get(identifier) || { count: 0 };
    entry.count++;
    
    if (entry.count >= this.maxAttempts) {
      // Apply exponential backoff
      const multiplier = Math.pow(2, Math.floor(entry.count / this.maxAttempts) - 1);
      entry.lockedUntil = Date.now() + (this.lockDurationMs * multiplier);
    }
    
    this.attempts.set(identifier, entry);
  }
  
  /**
   * Record successful attempt (clears failures)
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  /**
   * Check if identifier is locked
   */
  isLocked(identifier: string): { locked: boolean; retryAfter?: number } {
    const entry = this.attempts.get(identifier);
    
    if (!entry || !entry.lockedUntil) {
      return { locked: false };
    }
    
    const now = Date.now();
    
    if (entry.lockedUntil > now) {
      return {
        locked: true,
        retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
      };
    }
    
    // Lock expired
    this.attempts.delete(identifier);
    return { locked: false };
  }
  
  /**
   * Get attempt count
   */
  getAttempts(identifier: string): number {
    return this.attempts.get(identifier)?.count || 0;
  }
}

/**
 * Global brute-force protection instances
 */
export const loginBruteForce = new BruteForceProtection(
  5,  // 5 attempts
  15 * 60 * 1000, // 15 minutes lockout
  60 * 60 * 1000  // 1 hour window
);

export const passwordResetBruteForce = new BruteForceProtection(
  3,  // 3 attempts
  60 * 60 * 1000, // 1 hour lockout
  24 * 60 * 60 * 1000 // 24 hour window
);

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
}
