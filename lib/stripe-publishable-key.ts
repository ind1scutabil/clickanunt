/**
 * Cheie publică Stripe pentru inițializarea Stripe.js.
 *
 * În producție, preferă STRIPE_PUBLISHABLE_KEY în .env: nu este expusă prin prefix
 * NEXT_PUBLIC și poate fi citită la runtime cu `next start` (ideal după swap pe VPS
 * fără rebuild), alături de STRIPE_SECRET_KEY=sk_live_...
 *
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY rămâne pentru compatibilitate; poate fi inlinuit
 * din build dacă este setată la build-time — nu folosi pk_test acolo pe server live.
 */
export function getStripePublishableKey(): string {
  return (
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    ''
  );
}

/**
 * Log pe startup dacă în producție folosim chei de test sau mix live/test.
 * Suprimă cu STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 (ex. staging).
 */
export function warnIfStripeMisconfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION === '1') return;

  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  const pk = getStripePublishableKey();
  if (!sk || !pk) return;

  const skLive = sk.startsWith('sk_live_');
  const skTest = sk.startsWith('sk_test_');
  const pkLive = pk.startsWith('pk_live_');
  const pkTest = pk.startsWith('pk_test_');

  if (skTest || pkTest) {
    console.error(
      '[STRIPE] Chei de test cu NODE_ENV=production — plățile nu sunt reale (ex. Link „Enter 000000”). ' +
        'Setează pe server STRIPE_SECRET_KEY=sk_live_… și STRIPE_PUBLISHABLE_KEY=pk_live_…, apoi pm2 reload / redeploy.'
    );
  } else if (skLive !== pkLive) {
    console.error(
      '[STRIPE] Mismatch între STRIPE_SECRET_KEY și cheia publică (una live, alta test). Aliniază ambele la sk_live_/pk_live_.'
    );
  }
}
