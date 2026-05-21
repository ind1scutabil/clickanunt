/**
 * Optional Redis-backed fixed-window rate limiting (USE_REDIS_RATE_LIMIT=1).
 * Falls back to in-memory rateLimit() when flag is off, REDIS_URL is missing, or Redis errors.
 */

import { getRedisClient } from '@/lib/redis';
import { isRedisUrlConfigured } from '@/lib/redis-config';
import {
  UPLOAD_RATE_LIMIT_AUTH_PER_HOUR,
  UPLOAD_RATE_LIMIT_IP_PER_HOUR,
} from '@/lib/infra/production-limits';
import {
  LISTING_DRAFT_MAX_PER_USER,
  LISTING_DRAFT_WINDOW_MS,
  LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR,
  LISTING_PUBLISH_WINDOW_MS,
  LISTING_UPDATE_MAX_PER_USER,
  LISTING_UPDATE_WINDOW_MS,
  listingPublishMaxForRole,
} from '@/lib/listing-publish-rate-limit';
import {
  rateLimit,
  rateLimitPresets,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/rateLimit';
import { logger } from '@/lib/observability';

export function isRedisRateLimitEnabled(): boolean {
  return process.env.USE_REDIS_RATE_LIMIT === '1';
}

async function redisFixedWindowRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const lua = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return { current, ttl }
  `;

  const result = (await redis.eval(lua, 1, key, config.windowMs)) as [number, number];
  const count = Number(result[0]);
  const ttlMs = Number(result[1]);
  const now = Date.now();
  const allowed = count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);
  const resetTime = now + (ttlMs > 0 ? ttlMs : config.windowMs);
  const retryAfter = allowed
    ? undefined
    : Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : config.windowMs) / 1000));

  return { allowed, remaining, resetTime, retryAfter };
}

/**
 * Distributed or in-memory rate limit for a single key/window.
 */
export async function resolveRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (process.env.E2E_DISABLE_RATE_LIMIT === '1') {
    return { allowed: true, remaining: 999, resetTime: Date.now() + 60_000 };
  }

  if (!isRedisRateLimitEnabled()) {
    return rateLimit(key, config);
  }

  if (!isRedisUrlConfigured()) {
    logger.warn('USE_REDIS_RATE_LIMIT=1 but REDIS_URL is unset; using in-memory rate limit', {
      keyPrefix: key.split(':')[0],
    });
    return rateLimit(key, config);
  }

  try {
    return await redisFixedWindowRateLimit(key, config);
  } catch (error) {
    logger.warn('Redis rate limit unavailable; using in-memory fallback', {
      keyPrefix: key.split(':')[0],
      error: error instanceof Error ? error.message : String(error),
    });
    return rateLimit(key, config);
  }
}

/** Login preset — mirrors rateLimitPresets.login with optional Redis backing. */
export async function resolveLoginRateLimit(
  ip: string,
  emailHint = ''
): Promise<RateLimitResult> {
  if (!isRedisRateLimitEnabled()) {
    return rateLimitPresets.login(ip, emailHint);
  }

  const suffix =
    typeof emailHint === 'string'
      ? emailHint.trim().toLowerCase().slice(0, 254)
      : '';
  const credKey = `${ip}:${suffix || '_anonymous'}`;

  const ipVolume = await resolveRateLimit(`login:ip_vol:${ip}`, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 120,
  });
  if (!ipVolume.allowed) return ipVolume;

  return resolveRateLimit(`login:cred:${credKey}`, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  });
}

export type SecureRateLimitPreset =
  | 'login'
  | 'register'
  | 'listings'
  | 'listing_publish'
  | 'listing_draft'
  | 'listing_update'
  | 'messages'
  | 'reports'
  | 'upload'
  | 'contact'
  | 'api'
  | 'moderation';

/**
 * Maps validateSecureRequest rate-limit presets to distributed or in-memory limits.
 */
export async function resolveSecureRateLimit(
  preset: SecureRateLimitPreset,
  clientIp: string,
  userId: string | null,
  loginHint = '',
  role: string | null = null
): Promise<RateLimitResult> {
  switch (preset) {
    case 'login':
      return resolveLoginRateLimit(clientIp, loginHint);
    case 'register':
      return resolveRateLimit(`register:${clientIp}`, {
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
      });
    case 'listing_publish':
    case 'listings':
      if (!userId) {
        return resolveRateLimit(`listing:publish:ip:${clientIp}`, {
          windowMs: 60 * 60 * 1000,
          maxRequests: LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR,
        });
      }
      return resolveRateLimit(`listing:publish:${userId}`, {
        windowMs: LISTING_PUBLISH_WINDOW_MS,
        maxRequests: listingPublishMaxForRole(role),
      });
    case 'listing_draft':
      if (!userId) {
        return resolveRateLimit(`listing:draft:ip:${clientIp}`, {
          windowMs: 60 * 60 * 1000,
          maxRequests: LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR,
        });
      }
      return resolveRateLimit(`listing:draft:${userId}`, {
        windowMs: LISTING_DRAFT_WINDOW_MS,
        maxRequests: LISTING_DRAFT_MAX_PER_USER,
      });
    case 'listing_update':
      if (!userId) {
        return resolveRateLimit(`api:${clientIp}`, {
          windowMs: 60 * 1000,
          maxRequests: 30,
        });
      }
      return resolveRateLimit(`listing:update:${userId}`, {
        windowMs: LISTING_UPDATE_WINDOW_MS,
        maxRequests: LISTING_UPDATE_MAX_PER_USER,
      });
    case 'messages':
      return userId
        ? resolveRateLimit(`messages:user:${userId}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 250,
          })
        : resolveRateLimit(`messages:ip:${clientIp}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 500,
          });
    case 'reports':
      return userId
        ? resolveRateLimit(`report:create:${userId}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 5,
          })
        : resolveRateLimit(`reports:${clientIp}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 5,
          });
    case 'upload':
      return userId
        ? resolveRateLimit(`image:upload:${userId}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: UPLOAD_RATE_LIMIT_AUTH_PER_HOUR,
          })
        : resolveRateLimit(`upload:${clientIp}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: UPLOAD_RATE_LIMIT_IP_PER_HOUR,
          });
    case 'contact':
      return resolveRateLimit(`contact:${clientIp}`, {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
      });
    case 'api':
      return resolveRateLimit(`api:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 100,
      });
    case 'moderation':
      return userId
        ? resolveRateLimit(`moderation:${userId}`, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 200,
          })
        : resolveRateLimit(`api:${clientIp}`, {
            windowMs: 60 * 1000,
            maxRequests: 100,
          });
    default:
      return { allowed: true, remaining: 0, resetTime: 0 };
  }
}
