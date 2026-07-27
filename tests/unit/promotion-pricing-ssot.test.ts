/**
 * @jest-environment node
 */

import {
  DEFAULT_PROMOTION_PACKAGES,
  UI_PACKAGE_TO_STRIPE,
  effectivePriceBani,
  PROMOTION_UI_IDS,
} from '@/lib/promotion-packages';
import { PROMOTION_PRICES, PromotionPackage } from '@/lib/stripe';

describe('promotion pricing SSOT', () => {
  it('documents active UI package commercial defaults', () => {
    const byId = Object.fromEntries(DEFAULT_PROMOTION_PACKAGES.map((p) => [p.id, p]));
    expect(byId.top).toMatchObject({ price: 49, duration: 7 });
    expect(byId.urgent).toMatchObject({ price: 29, duration: 3 });
    expect(byId.featured).toMatchObject({ price: 19, duration: 5 });
    expect(byId.refresh).toMatchObject({ price: 9, duration: 0 });
  });

  it('maps every UI package to a Stripe PromotionPackage enum value', () => {
    for (const id of PROMOTION_UI_IDS) {
      expect(Object.values(PromotionPackage)).toContain(UI_PACKAGE_TO_STRIPE[id]);
      expect(PROMOTION_PRICES[UI_PACKAGE_TO_STRIPE[id]]).toBeGreaterThan(0);
    }
  });

  it('notes legacy PROMOTION_PRICES are fallback-only and differ from UI SSOT', () => {
    // Canonical card amount comes from DEFAULT_PROMOTION_PACKAGES / FeatureFlag via
    // resolvePromotionPaymentBaseBani — not PROMOTION_PRICES — when packageId is sent.
    const featuredUiBani = effectivePriceBani(19, 0);
    const featuredStripeFallback = PROMOTION_PRICES[PromotionPackage.FEATURED_7_DAYS];
    expect(featuredUiBani).toBe(1900);
    expect(featuredStripeFallback).toBe(2900);
    expect(featuredUiBani).not.toBe(featuredStripeFallback);
  });
});
