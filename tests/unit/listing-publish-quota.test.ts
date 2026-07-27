/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  LISTING_PUBLISH_MAX_AUTHENTICATED,
  LISTING_PUBLISH_MAX_PRIVILEGED,
  listingPublishMaxForRole,
} from '@/lib/listing-publish-rate-limit';
import { LISTING_PUBLISH_QUOTA_STATUSES } from '@/lib/listing-publish-quota';

describe('listing-publish-quota', () => {
  it('quota statuses exclude draft', () => {
    expect(LISTING_PUBLISH_QUOTA_STATUSES).toEqual(['active', 'pending']);
    expect(LISTING_PUBLISH_QUOTA_STATUSES).not.toContain('draft');
  });

  it('authenticated cap is 100 per 24h', () => {
    expect(listingPublishMaxForRole('user')).toBe(LISTING_PUBLISH_MAX_AUTHENTICATED);
    expect(LISTING_PUBLISH_MAX_AUTHENTICATED).toBe(100);
  });

  it('privileged cap is 500 per 24h', () => {
    expect(listingPublishMaxForRole('admin')).toBe(LISTING_PUBLISH_MAX_PRIVILEGED);
    expect(LISTING_PUBLISH_MAX_PRIVILEGED).toBe(500);
  });

  it('E2E_DISABLE_RATE_LIMIT bypasses daily publish quota (source string contract)', () => {
    // Behavior is env-gated in assertDailyPublishQuotaAllowed; keep the flag name
    // aligned with lib/rateLimit.ts so one env unlocks both IP limiters and quota.
    const src = readFileSync(
      path.join(__dirname, '../../lib/listing-publish-quota.ts'),
      'utf8'
    );
    expect(src).toContain("E2E_DISABLE_RATE_LIMIT === '1'");
    expect(src).toContain('e2e_bypass');
  });
});
