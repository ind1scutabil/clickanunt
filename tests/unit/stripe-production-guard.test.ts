/** @jest-environment node */
import {
  STRIPE_PRODUCTION_FATAL_MESSAGE,
  enforceStripeProductionCredentials,
  hasProductionStripeGuardFingerprint,
  isStripeTestKeysBypassAllowed,
  isStripeTestWebhookSecret,
  validateStripeProductionCredentials,
} from '@/lib/stripe-production-guard';

describe('stripe-production-guard', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    STRIPE_SECRET_KEY: 'sk_live_abc123',
    STRIPE_WEBHOOK_SECRET: 'whsec_live_endpoint_secret_value',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_xyz',
  };

  it('allows live keys in production', () => {
    const result = validateStripeProductionCredentials({ ...baseEnv });
    expect(result.ok).toBe(true);
  });

  it('allows development + test key', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'development',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects sk_test in production without bypass', () => {
    const result = validateStripeProductionCredentials({
      ...baseEnv,
      STRIPE_SECRET_KEY: 'sk_test_abc',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('STRIPE_SECRET_KEY'))).toBe(true);
  });

  it('rejects pk_test in production', () => {
    const result = validateStripeProductionCredentials({
      ...baseEnv,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects live sk without webhook secret', () => {
    const result = validateStripeProductionCredentials({
      ...baseEnv,
      STRIPE_WEBHOOK_SECRET: '',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('WEBHOOK'))).toBe(true);
  });

  it('rejects placeholder webhook secret with live sk', () => {
    expect(isStripeTestWebhookSecret('whsec_REPLACE_ME', 'sk_live_x')).toBe(true);
  });

  it('enforce throws with fatal message', () => {
    expect(() =>
      enforceStripeProductionCredentials({
        NODE_ENV: 'production',
        STRIPE_SECRET_KEY: 'sk_test_bad',
        STRIPE_WEBHOOK_SECRET: 'whsec_x',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_ok',
      })
    ).toThrow(STRIPE_PRODUCTION_FATAL_MESSAGE);
  });

  it('rejects STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION alone', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(result.ok).toBe(false);
    expect(isStripeTestKeysBypassAllowed({
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
    })).toBe(false);
  });

  it('allows E2E production build + markers + test keys', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
      CLICKANUNT_E2E_SERVER: '1',
      E2E_DISABLE_RATE_LIMIT: '1',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/clickanunt_e2e',
    });
    expect(result.ok).toBe(true);
  });

  it('allows staging site + test keys without production fingerprints', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
      STAGING_SITE: '1',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
      DATABASE_URL: 'postgresql://u:p@db.staging.internal/clickanunt_staging',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects E2E markers when DATABASE_URL has production fingerprint', () => {
    expect(
      hasProductionStripeGuardFingerprint({
        DATABASE_URL: 'postgresql://u:p@46.225.69.155:5432/autoplat',
      })
    ).toBe(true);
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
      CLICKANUNT_E2E_SERVER: '1',
      E2E_DISABLE_RATE_LIMIT: '1',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
      DATABASE_URL: 'postgresql://u:p@46.225.69.155:5432/autoplat',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects missing secret key in production', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid secret prefix', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_SECRET_KEY: 'not_a_stripe_key',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
    });
    expect(result.ok).toBe(false);
  });
});
