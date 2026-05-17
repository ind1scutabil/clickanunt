import {
  LISTING_MAX_PHOTOS,
  UPLOAD_RATE_LIMIT_AUTH_PER_HOUR,
  UPLOAD_RATE_LIMIT_IP_PER_HOUR,
} from '@/lib/infra/production-limits';

describe('upload rate limits', () => {
  it('authenticated hourly limit allows multiple full listing sessions with retries', () => {
    expect(UPLOAD_RATE_LIMIT_AUTH_PER_HOUR).toBeGreaterThanOrEqual(
      LISTING_MAX_PHOTOS * 3
    );
  });

  it('IP fallback limit covers at least one full listing', () => {
    expect(UPLOAD_RATE_LIMIT_IP_PER_HOUR).toBeGreaterThanOrEqual(LISTING_MAX_PHOTOS);
  });
});
