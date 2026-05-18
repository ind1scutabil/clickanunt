/** @jest-environment node */
import {
  STRIPE_PRODUCTION_FATAL_MESSAGE,
  enforceStripeProductionCredentials,
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

  it('skips strict checks outside production', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'development',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects sk_test in production', () => {
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

  it('allows test keys when STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1', () => {
    const result = validateStripeProductionCredentials({
      NODE_ENV: 'production',
      STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(result.ok).toBe(true);
  });
});
