/**
 * @jest-environment node
 */

import {
  isRedisUrlConfigured,
  isDistributedRateLimitActive,
} from '@/lib/redis-config';

describe('redis-config', () => {
  const origUrl = process.env.REDIS_URL;
  const origFlag = process.env.USE_REDIS_RATE_LIMIT;

  afterEach(() => {
    if (origUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = origUrl;
    if (origFlag === undefined) delete process.env.USE_REDIS_RATE_LIMIT;
    else process.env.USE_REDIS_RATE_LIMIT = origFlag;
  });

  it('isRedisUrlConfigured false when unset', () => {
    delete process.env.REDIS_URL;
    expect(isRedisUrlConfigured()).toBe(false);
  });

  it('isDistributedRateLimitActive requires both flag and url', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.USE_REDIS_RATE_LIMIT = '1';
    expect(isDistributedRateLimitActive()).toBe(true);
    delete process.env.REDIS_URL;
    expect(isDistributedRateLimitActive()).toBe(false);
  });
});
