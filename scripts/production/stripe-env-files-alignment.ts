/**
 * Deploy-time only: ensure .env Stripe keys match .env.production (PM2 uses .env).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isStripeLiveSecretKey, isStripeTestSecretKey } from '../../lib/stripe-publishable-key';

const STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

function parseEnvFile(path: string): Record<string, string> {
  const o: Record<string, string> = {};
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[t.slice(0, i).trim()] = v;
  }
  return o;
}

export function validateStripeEnvFilesAligned(cwd = process.cwd()): string[] {
  const envPath = join(cwd, '.env');
  const prodPath = join(cwd, '.env.production');
  if (!existsSync(envPath) || !existsSync(prodPath)) return [];

  const env = parseEnvFile(envPath);
  const prod = parseEnvFile(prodPath);
  const errors: string[] = [];

  for (const key of STRIPE_ENV_KEYS) {
    const a = env[key]?.trim();
    const b = prod[key]?.trim();
    if (!b) continue;
    if (a && a !== b) {
      errors.push(
        `${key} in .env does not match .env.production — run scripts/production/sync-stripe-env-from-production.mjs`
      );
    }
  }

  const prodSk = prod.STRIPE_SECRET_KEY?.trim() ?? '';
  if (prodSk && isStripeLiveSecretKey(prodSk)) {
    const envSk = env.STRIPE_SECRET_KEY?.trim() ?? '';
    if (envSk && isStripeTestSecretKey(envSk)) {
      errors.push(
        'STRIPE_SECRET_KEY in .env is test mode but .env.production has live keys'
      );
    }
  }

  return errors;
}
