/**
 * @jest-environment node
 */

import {
  LISTING_PUBLISH_MAX_AUTHENTICATED,
  LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR,
  LISTING_PUBLISH_WINDOW_MS,
  formatSecureRateLimitErrorRo,
  isPrivilegedListingRole,
  listingPublishMaxForRole,
} from '@/lib/listing-publish-rate-limit';
import { resolveSecureRateLimit } from '@/lib/rate-limit-distributed';
import { rateLimitPresets, resetRateLimit } from '@/lib/rateLimit';

describe('listing-publish-rate-limit', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    resetRateLimit(`listing:publish:${userId}`);
    resetRateLimit('listing:publish:ip:203.0.113.9');
    resetRateLimit('image:upload:upload-test-user');
  });

  it('authenticated user can exceed legacy 10/hour cap (15 publishes in test window)', async () => {
    let lastAllowed = true;
    for (let i = 0; i < 15; i++) {
      const r = await resolveSecureRateLimit('listing_publish', '203.0.113.1', userId, '', 'user');
      lastAllowed = r.allowed;
      if (!r.allowed) break;
    }
    expect(lastAllowed).toBe(true);
  });

  it('anonymous IP publish attempts are blocked after low threshold', async () => {
    let blocked = false;
    for (let i = 0; i < LISTING_PUBLISH_MAX_ANONYMOUS_PER_HOUR + 2; i++) {
      const r = await resolveSecureRateLimit('listing_publish', '203.0.113.9', null);
      if (!r.allowed) {
        blocked = true;
        expect(r.retryAfter).toBeGreaterThan(0);
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it('legacy createListing preset allows more than 10 per 24h window', () => {
    let allowed = 0;
    for (let i = 0; i < 12; i++) {
      const r = rateLimitPresets.createListing(userId);
      if (r.allowed) allowed++;
    }
    expect(allowed).toBe(12);
  });

  it('upload preset is unchanged and separate from publish key', () => {
    const uploadUser = 'upload-test-user';
    resetRateLimit(`image:upload:${uploadUser}`);
    const first = rateLimitPresets.uploadImage(uploadUser);
    expect(first.allowed).toBe(true);
    expect(LISTING_PUBLISH_MAX_AUTHENTICATED).toBeGreaterThanOrEqual(50);
    expect(LISTING_PUBLISH_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('privileged role gets higher publish cap', () => {
    expect(listingPublishMaxForRole('admin')).toBeGreaterThan(LISTING_PUBLISH_MAX_AUTHENTICATED);
    expect(isPrivilegedListingRole('moderator')).toBe(true);
  });

  it('Romanian error mentions publish limit and wait time', () => {
    const msg = formatSecureRateLimitErrorRo('listing_publish', 120);
    expect(msg).toMatch(/publicare anunțuri/i);
    expect(msg).toMatch(/120 secunde/);
    expect(msg).not.toMatch(/Too many requests/i);
  });
});
