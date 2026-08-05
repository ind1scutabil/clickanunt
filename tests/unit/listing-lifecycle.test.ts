/**
 * @jest-environment node
 */

import {
  isListingPromotionEligible,
  promotionIneligibleReason,
  resolveOwnerStatusTransition,
  applyListingPublishExpiryOnApprove,
} from '@/lib/listing-lifecycle';

describe('listing lifecycle helpers', () => {
  const now = new Date('2026-07-27T12:00:00.000Z');

  it('allows promotion only for active+approved+not expired', () => {
    expect(
      isListingPromotionEligible(
        {
          status: 'active',
          moderationStatus: 'approved',
          deletedAt: null,
          expiresAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        now
      )
    ).toBe(true);

    expect(
      isListingPromotionEligible(
        { status: 'paused', moderationStatus: 'approved', deletedAt: null, expiresAt: null },
        now
      )
    ).toBe(false);

    expect(
      isListingPromotionEligible(
        {
          status: 'active',
          moderationStatus: 'pending',
          deletedAt: null,
          expiresAt: null,
        },
        now
      )
    ).toBe(false);

    expect(
      isListingPromotionEligible(
        {
          status: 'active',
          moderationStatus: 'approved',
          deletedAt: null,
          expiresAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        now
      )
    ).toBe(false);

    expect(
      promotionIneligibleReason(
        {
          status: 'active',
          moderationStatus: 'approved',
          deletedAt: null,
          expiresAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        now
      )
    ).toMatch(/expired/i);
  });

  it('owner can pause active, not expired', () => {
    const ok = resolveOwnerStatusTransition(
      {
        status: 'active',
        moderationStatus: 'approved',
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      },
      'paused',
      now
    );
    expect(ok).toEqual({ ok: true, status: 'paused' });
  });

  it('owner renew of date-expired active goes to pending and clears expiry', () => {
    const ok = resolveOwnerStatusTransition(
      {
        status: 'active',
        moderationStatus: 'approved',
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      'pending',
      now
    );
    expect(ok).toEqual({
      ok: true,
      status: 'pending',
      moderationStatus: 'pending',
      clearExpiresAt: true,
    });
  });

  it('owner cannot spoof active status', () => {
    const bad = resolveOwnerStatusTransition(
      { status: 'paused', moderationStatus: 'approved' },
      'active',
      now
    );
    expect(bad.ok).toBe(false);
  });

  it('owner reactivate paused goes through moderation', () => {
    const ok = resolveOwnerStatusTransition(
      { status: 'paused', moderationStatus: 'rejected' },
      'pending',
      now
    );
    expect(ok).toEqual({
      ok: true,
      status: 'pending',
      moderationStatus: 'pending',
    });
  });

  it('approve refreshes past expiresAt', () => {
    const fields = applyListingPublishExpiryOnApprove(
      {
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-31T00:00:00.000Z'),
      },
      now
    );
    expect(fields.expiresAt).toBeInstanceOf(Date);
    expect(fields.expiresAt!.getTime()).toBeGreaterThan(now.getTime());
    expect(fields.publishedAt).toBeInstanceOf(Date);
  });
});
