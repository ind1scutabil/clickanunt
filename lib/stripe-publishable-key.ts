/**
 * Cheie publică Stripe pentru inițializarea Stripe.js.
 *
 * Preferă STRIPE_PUBLISHABLE_KEY în .env (citire la runtime), apoi NEXT_PUBLIC_*.
 */
export function getStripePublishableKey(): string {
  return (
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    ''
  );
}

export function isStripeLiveSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_live_') || s.startsWith('rk_live_');
}

export function isStripeTestSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_test_') || s.startsWith('rk_test_');
}

/**
 * Avertizare la pornire (nu blochează plățile — Stripe aplică propriile reguli).
 */
export function warnIfStripeMisconfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION === '1') return;

  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  const pk = getStripePublishableKey();
  if (!sk || !pk) return;

  if (isStripeTestSecretKey(sk) || pk.startsWith('pk_test_')) {
    console.warn(
      '[STRIPE] În producție apar prefixe de chei de test în .env. Pentru carduri reale folosește Live (sk_live_/pk_live_/rk_live_: https://dashboard.stripe.com/apikeys)'
    );
  }
}
