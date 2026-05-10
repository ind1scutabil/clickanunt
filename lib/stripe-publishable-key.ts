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

/** Cheie secretă standard */
export function isStripeLiveSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_live_') || s.startsWith('rk_live_');
}

export function isStripeTestSecretKey(secret: string): boolean {
  const s = secret.trim();
  return s.startsWith('sk_test_') || s.startsWith('rk_test_');
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

export type StripePaymentGateFailure = {
  httpStatus: 503;
  error: string;
  code: string;
  /** Doar pentru log server */
  logDetail: string;
};

export type StripePaymentGateResult =
  | { ok: true }
  | ({ ok: false } & StripePaymentGateFailure);

/**
 * Blochează plata în producție când lipsesc chei LIVE sau sunt încă de test.
 * Acceptă și chei Stripe „Restricted”: rk_live_* / rk_test_*.
 */
export function gateStripeProductionPayments(): StripePaymentGateResult {
  if (!isProductionStripeEnforcement()) {
    return { ok: true };
  }

  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  const pk = getStripePublishableKey();

  if (!sk) {
    return {
      ok: false,
      httpStatus: 503,
      code: 'stripe_secret_missing',
      logDetail: 'STRIPE_SECRET_KEY lipsește din mediul procesului Node',
      error:
        'Plata nu este configurată corect pe server (lipsește cheia secretă Stripe). Contactează administratorul site-ului.',
    };
  }

  if (isStripeTestSecretKey(sk)) {
    return {
      ok: false,
      httpStatus: 503,
      code: 'stripe_secret_test',
      logDetail: 'STRIPE_SECRET_KEY este sk_test_/rk_test_ pe mediul unde se cere mod live',
      error:
        'Pe server sunt încă folosite chei Stripe de test. În fișierul .env din producție înlocuiește cu cheia secretă din modul Live din Dashboard Stripe (începe cu sk_live_ sau rk_live_), apoi rulează: pm2 reload ecosystem.config.js --update-env.',
    };
  }

  if (pk.startsWith('pk_test_')) {
    return {
      ok: false,
      httpStatus: 503,
      code: 'stripe_publishable_test',
      logDetail: 'Cheia publică este pk_test_*',
      error:
        'Cheia publică Stripe pe server este în mod test. În .env setează STRIPE_PUBLISHABLE_KEY=pk_live_… (aceeași cont Stripe, mod Live), apoi pm2 reload.',
    };
  }

  if (isStripeLiveSecretKey(sk) && pk.startsWith('pk_live_')) {
    return { ok: true };
  }

  if (isStripeLiveSecretKey(sk) && !pk) {
    return {
      ok: false,
      httpStatus: 503,
      code: 'stripe_publishable_missing',
      logDetail: 'Cheie secretă live dar lipsă STRIPE_PUBLISHABLE_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      error:
        'Lipsește cheia publică live pe server (pk_live_…). În .env la /var/www/clickanunt adaugă STRIPE_PUBLISHABLE_KEY=pk_live_… copiată din Stripe Dashboard → API keys → Live, apoi: cd /var/www/clickanunt && pm2 reload ecosystem.config.js --update-env.',
    };
  }

  return {
    ok: false,
    httpStatus: 503,
    code: 'stripe_keys_unrecognized',
    logDetail: `STRIPE_SECRET_KEY nu pare sk_live/sk_test/rk_live/rk_test (prefix: ${sk.slice(0, 12)}…) sau pk nu e pk_live`,
    error:
      'Configurația Stripe de pe server nu este recunoscută (pereche nevalidă). Verifică în .env: STRIPE_SECRET_KEY=sk_live_… sau rk_live_… și STRIPE_PUBLISHABLE_KEY=pk_live_… din același mod Live.',
  };
}

/** @deprecated Folosește gateStripeProductionPayments() */
export function getStripeProductionPaymentBlockReason(): string | null {
  const g = gateStripeProductionPayments();
  return g.ok ? null : g.logDetail;
}

export function warnIfStripeMisconfiguredForProduction(): void {
  const g = gateStripeProductionPayments();
  if (!g.ok) {
    console.error('[STRIPE] Plățile live sunt blocate:', g.code, '—', g.logDetail);
  }
}
