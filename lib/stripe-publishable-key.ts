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
 * Când forțăm chei LIVE (blocăm sk_test_/pk_test_).
 * - STRIPE_REQUIRE_LIVE=1 pe VPS (recomandat pentru clickanunt.ro)
 * - sau NODE_ENV=production
 * - sau URL-urile publice conțin clickanunt.ro
 */
export function isProductionStripeEnforcement(): boolean {
  if (process.env.STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION === '1') return false;
  if (process.env.STRIPE_REQUIRE_LIVE === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  const blob = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
  ]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .join(' ')
    .toLowerCase();
  if (blob.includes('clickanunt.ro')) return true;
  return false;
}

/**
 * Log pe startup dacă în producție folosim chei de test sau mix live/test.
 * Suprimă cu STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 (ex. staging).
 */
/**
 * Blochează crearea PaymentIntent în producție când Stripe e încă în mod test
 * (carduri reale dau „test mode … non-test card”).
 * Returnează motiv tehnic pentru log; răspunsul HTTP folosește mesaj pentru utilizator.
 */
export function getStripeProductionPaymentBlockReason(): string | null {
  if (!isProductionStripeEnforcement()) return null;

  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  const pk = getStripePublishableKey();

  if (sk.startsWith('sk_test_')) {
    return 'STRIPE_SECRET_KEY este sk_test_* în producție — folosește sk_live_* în .env pe server.';
  }
  if (pk.startsWith('pk_test_')) {
    return 'Cheia publică este pk_test_* în producție — setează STRIPE_PUBLISHABLE_KEY=pk_live_* (aceeași pereche ca sk_live).';
  }
  if (!pk && sk.startsWith('sk_live_')) {
    return 'Lipsește cheia publică live (STRIPE_PUBLISHABLE_KEY sau NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_*).';
  }
  if (sk.startsWith('sk_live_') && pk.startsWith('pk_live_')) {
    return null;
  }
  return 'Configurare Stripe în producție: secret/cheie publică trebuie să fie pereche sk_live_* + pk_live_*.';
}

export function warnIfStripeMisconfiguredForProduction(): void {
  if (!isProductionStripeEnforcement()) return;

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
