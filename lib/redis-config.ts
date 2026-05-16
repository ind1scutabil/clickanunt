/**
 * Redis configuration helpers — no behavior change unless callers opt in.
 */

export function isRedisUrlConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/** Staging/ops: both flags required for distributed rate limits. */
export function isDistributedRateLimitActive(): boolean {
  return (
    process.env.USE_REDIS_RATE_LIMIT === '1' && isRedisUrlConfigured()
  );
}
