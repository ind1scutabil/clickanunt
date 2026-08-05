/**
 * @jest-environment node
 */

import { isListingSeoIndexable } from '@/lib/seo/listing-seo-eligibility';
import { seoIndexableListingWhere } from '@/lib/seo/indexable-listing-where';

describe('public expiry visibility', () => {
  const now = new Date('2026-07-27T12:00:00.000Z');

  it('past expiresAt is not SEO indexable even when active+approved', () => {
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: 'active',
        moderationStatus: 'approved',
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
      })
    ).toBe(false);
  });

  it('seoIndexableListingWhere includes expiry OR null', () => {
    const where = seoIndexableListingWhere(now);
    expect(where.status).toBe('active');
    expect(where.deletedAt).toBeNull();
    expect(where.moderationStatus).toBe('approved');
    expect(where.AND).toBeDefined();
  });
});
