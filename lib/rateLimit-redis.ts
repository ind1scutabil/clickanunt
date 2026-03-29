import { getRedisClient, RedisUnavailableError } from '@/lib/redis';
import type { RateLimitResult } from '@/lib/rateLimit';

const paymentWindowMs = 60 * 60 * 1000; // 1 hour
const paymentMaxRequests = 20; // per hour

async function redisFixedWindowRateLimit(params: {
  key: string;
  windowMs: number;
  maxRequests: number;
}): Promise<{ count: number; ttlMs: number }> {
  const redis = getRedisClient();

  // Atomic fixed-window counter:
  // - INCR key
  // - if first request, set PX expiry to windowMs
  // - return count and remaining TTL
  const lua = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return { current, ttl }
  `;

  const result = (await redis.eval(lua, 1, params.key, params.windowMs)) as [number, number];
  const count = Number(result[0]);
  const ttlMs = Number(result[1]);
  return { count, ttlMs };
}

export async function rateLimitPaymentRedis(ip: string): Promise<RateLimitResult> {
  const key = `rateLimit:payment:${ip}`;

  try {
    const { count, ttlMs } = await redisFixedWindowRateLimit({
      key,
      windowMs: paymentWindowMs,
      maxRequests: paymentMaxRequests,
    });

    const allowed = count <= paymentMaxRequests;
    const remaining = Math.max(0, paymentMaxRequests - count);
    const resetTime = Date.now() + (ttlMs > 0 ? ttlMs : paymentWindowMs);
    const retryAfter = allowed ? undefined : Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : paymentWindowMs) / 1000));

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter,
    };
  } catch (error) {
    if (error instanceof RedisUnavailableError) throw error;
    throw new RedisUnavailableError('Redis rate limiting failed');
  }
}

