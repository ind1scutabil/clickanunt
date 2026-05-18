import { getStripePublishableKeyRuntime, getStripeSecretKeyRuntime } from './stripe-env-runtime';

/**
 * Cheie publică Stripe pentru inițializarea Stripe.js.
 * Citire dinamică — vezi stripe-env-runtime (evită inlining la next build).
 */
export function getStripePublishableKey(): string {
  return getStripePublishableKeyRuntime();
}

export function isStripeLiveSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_live_') || s.startsWith('rk_live_');
}

export function isStripeTestSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_test_') || s.startsWith('rk_test_');
}

/** @deprecated Use enforceStripeProductionCredentials from stripe-production-guard */
export function warnIfStripeMisconfiguredForProduction(): void {
  // Kept for backwards compatibility; production boot is enforced in instrumentation.ts
  if (process.env.NODE_ENV !== 'production') return;
  const sk = (getStripeSecretKeyRuntime() || '').trim();
  const pk = getStripePublishableKey();
  if (!sk || !pk) return;
  if (isStripeTestSecretKey(sk) || pk.startsWith('pk_test_')) {
    console.warn(
      '[STRIPE] Test key prefixes detected — production boot should be blocked by stripe-production-guard'
    );
  }
}
