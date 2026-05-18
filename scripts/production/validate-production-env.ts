#!/usr/bin/env npx ts-node
/**
 * Validates Stripe (and optional .env / .env.production alignment) for production deploy.
 *
 * Usage:
 *   npm run validate:production-env              # strict when NODE_ENV=production
 *   npm run validate:production-env -- --strict  # always enforce production rules
 *   npm run validate:production-env -- --check-files-only
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  enforceStripeProductionCredentials,
  validateStripeProductionCredentials,
} from '../../lib/stripe-production-guard';
import { validateStripeEnvFilesAligned } from './stripe-env-files-alignment';

const args = process.argv.slice(2);
const strict = args.includes('--strict') || process.env.NODE_ENV === 'production';
const checkFilesOnly = args.includes('--check-files-only');
const cwd = process.cwd();

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = v;
    }
  }
}

loadDotEnv(resolve(cwd, '.env'));
loadDotEnv(resolve(cwd, '.env.production'));

if (checkFilesOnly) {
  const fileErrors = validateStripeEnvFilesAligned(cwd);
  if (fileErrors.length) {
    console.error('[FAIL] Stripe .env / .env.production mismatch:');
    fileErrors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('[PASS] Stripe keys aligned between .env and .env.production');
  process.exit(0);
}

if (!strict) {
  console.log(
    '[SKIP] validate:production-env (set NODE_ENV=production or pass --strict for full check)'
  );
  process.exit(0);
}

const prodEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
};

const fileErrors = validateStripeEnvFilesAligned(cwd);
const preview = validateStripeProductionCredentials(prodEnv);
const allErrors = [...preview.errors, ...fileErrors];
if (allErrors.length) {
  console.error('[FAIL] Production Stripe env validation:');
  allErrors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

try {
  enforceStripeProductionCredentials(prodEnv);
} catch {
  process.exit(1);
}

console.log('[PASS] Production Stripe env validation (live keys, webhook secret, alignment)');
