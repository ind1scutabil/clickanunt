/**
 * @jest-environment node
 */

import {
  isRedisRateLimitEnabled,
  resolveRateLimit,
} from '@/lib/rate-limit-distributed';

describe('rate-limit-distributed', () => {
  const origRedisFlag = process.env.USE_REDIS_RATE_LIMIT;
  const origRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (origRedisFlag === undefined) delete process.env.USE_REDIS_RATE_LIMIT;
    else process.env.USE_REDIS_RATE_LIMIT = origRedisFlag;
    if (origRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = origRedisUrl;
  });

  it('isRedisRateLimitEnabled is false by default', () => {
    delete process.env.USE_REDIS_RATE_LIMIT;
    expect(isRedisRateLimitEnabled()).toBe(false);
  });

  it('isRedisRateLimitEnabled is true when USE_REDIS_RATE_LIMIT=1', () => {
    process.env.USE_REDIS_RATE_LIMIT = '1';
    expect(isRedisRateLimitEnabled()).toBe(true);
  });

  it('resolveRateLimit uses in-memory when flag is off', async () => {
    delete process.env.USE_REDIS_RATE_LIMIT;
    const r = await resolveRateLimit('test:unit:off', {
      windowMs: 60_000,
      maxRequests: 2,
    });
    expect(r.allowed).toBe(true);
  });
});
