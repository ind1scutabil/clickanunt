/**
 * Production guard: refuse to boot with Stripe test credentials when NODE_ENV=production,
 * unless an explicit non-production runtime is proven (E2E gate or staging site) and
 * known production host/DB fingerprints are absent.
 *
 * STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 alone is NEVER sufficient.
 */

import {
  getStripePublishableKeyRuntime,
  getStripeSecretKeyRuntime,
  getStripeWebhookSecretRuntime,
} from './stripe-env-runtime';
import {
  isStripeLiveSecretKey,
  isStripeTestSecretKey,
} from './stripe-publishable-key';

export const STRIPE_PRODUCTION_FATAL_MESSAGE =
  'Refusing to start production with Stripe TEST credentials';

export const PROD_STRIPE_GUARD_FINGERPRINTS = [
  /46\.225\.69\.155/,
  /clickanunt\.ro/i,
] as const;

const PLACEHOLDER_WEBHOOK_SECRETS = new Set([
  'whsec_REPLACE_ME',
  'whsec_replace_me',
  'whsec_your_webhook_secret',
]);

export type StripeProductionValidationResult = {
  ok: boolean;
  errors: string[];
};

function isTestPublishableKey(pk: string): boolean {
  const s = pk.trim();
  return s.startsWith('pk_test_');
}

function isLivePublishableKey(pk: string): boolean {
  const s = pk.trim();
  return s.startsWith('pk_live_');
}

/** Invalid webhook secret for live mode (placeholder or paired with test API key). */
export function isStripeTestWebhookSecret(
  webhookSecret: string,
  secretKey: string
): boolean {
  const wh = webhookSecret.trim();
  if (!wh) return false;
  if (PLACEHOLDER_WEBHOOK_SECRETS.has(wh)) return true;
  if (isStripeTestSecretKey(secretKey)) return true;
  return false;
}

/** True when env looks like known production host/DB/domain. */
export function hasProductionStripeGuardFingerprint(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const haystacks = [
    env.DATABASE_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.STAGING_DEPLOY_SERVER,
    env.DEPLOY_SERVER,
    env.HOST,
  ]
    .filter(Boolean)
    .join('\n');
  return PROD_STRIPE_GUARD_FINGERPRINTS.some((re) => re.test(haystacks));
}

/**
 * Test keys in NODE_ENV=production are allowed only for:
 * - local E2E production build: STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 + CLICKANUNT_E2E_SERVER=1
 * - staging site: STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 + STAGING_SITE=1
 * and never when production fingerprints are present.
 */
export function isStripeTestKeysBypassAllowed(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION !== '1') {
    return false;
  }
  if (hasProductionStripeGuardFingerprint(env)) {
    return false;
  }
  const e2e =
    env.CLICKANUNT_E2E_SERVER === '1' && env.E2E_DISABLE_RATE_LIMIT === '1';
  const staging = env.STAGING_SITE === '1';
  return e2e || staging;
}

export function validateStripeProductionCredentials(
  env: NodeJS.ProcessEnv = process.env
): StripeProductionValidationResult {
  const errors: string[] = [];

  if (env.NODE_ENV !== 'production') {
    return { ok: true, errors: [] };
  }

  const sk = (env.STRIPE_SECRET_KEY ?? getStripeSecretKeyRuntime() ?? '').trim();
  const wh = (env.STRIPE_WEBHOOK_SECRET ?? getStripeWebhookSecretRuntime() ?? '').trim();
  const pk = (
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    env.STRIPE_PUBLISHABLE_KEY ??
    getStripePublishableKeyRuntime() ??
    ''
  ).trim();

  const usingTestSecret = Boolean(sk && isStripeTestSecretKey(sk));
  const usingTestPk = Boolean(pk && isTestPublishableKey(pk));

  if ((usingTestSecret || usingTestPk) && isStripeTestKeysBypassAllowed(env)) {
    return { ok: true, errors: [] };
  }

  if (env.STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION === '1' && (usingTestSecret || usingTestPk)) {
    if (hasProductionStripeGuardFingerprint(env)) {
      errors.push(
        'STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION is set but production host/DB fingerprints were detected'
      );
    } else if (env.CLICKANUNT_E2E_SERVER !== '1' && env.STAGING_SITE !== '1') {
      errors.push(
        'STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION requires CLICKANUNT_E2E_SERVER=1 (with E2E_DISABLE_RATE_LIMIT=1) or STAGING_SITE=1'
      );
    }
  }

  if (sk && isStripeTestSecretKey(sk)) {
    errors.push('STRIPE_SECRET_KEY uses test prefix (sk_test_/rk_test_)');
  }

  if (pk && isTestPublishableKey(pk)) {
    errors.push(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or STRIPE_PUBLISHABLE_KEY uses test prefix (pk_test_)'
    );
  }

  if (!sk) {
    errors.push('STRIPE_SECRET_KEY is missing');
  } else if (!isStripeLiveSecretKey(sk) && !isStripeTestSecretKey(sk)) {
    errors.push('STRIPE_SECRET_KEY has an invalid prefix (expected sk_live_/sk_test_/rk_*)');
  }

  if (sk && isStripeLiveSecretKey(sk)) {
    if (!wh) {
      errors.push('STRIPE_WEBHOOK_SECRET is missing (required with live secret key)');
    } else if (!wh.startsWith('whsec_')) {
      errors.push('STRIPE_WEBHOOK_SECRET must start with whsec_');
    } else if (isStripeTestWebhookSecret(wh, sk)) {
      errors.push(
        'STRIPE_WEBHOOK_SECRET is invalid or paired with test credentials (use live endpoint signing secret)'
      );
    }
  }

  if (pk && sk && isStripeLiveSecretKey(sk) && !isLivePublishableKey(pk)) {
    errors.push(
      'Publishable key must be pk_live_ when STRIPE_SECRET_KEY is live (sk_live_/rk_live_)'
    );
  }

  return { ok: errors.length === 0, errors };
}

export function enforceStripeProductionCredentials(
  env: NodeJS.ProcessEnv = process.env
): void {
  const result = validateStripeProductionCredentials(env);
  if (result.ok) return;

  console.error(`❌ FATAL: ${STRIPE_PRODUCTION_FATAL_MESSAGE}`);
  for (const err of result.errors) {
    console.error(`  - ${err}`);
  }
  throw new Error(STRIPE_PRODUCTION_FATAL_MESSAGE);
}
