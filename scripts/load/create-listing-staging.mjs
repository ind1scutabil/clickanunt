#!/usr/bin/env node
/**
 * Staging-only smoke: single GET /api/listings (read) — does NOT POST listings.
 * Real create-listing load would need CSRF + auth; use integration tests instead.
 */
import { assertLoadTestAllowed, resolveBaseUrl, runConcurrentGets } from './lib/guard.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

if (process.env.LOAD_ALLOW_STAGING !== '1') {
  console.error('ERROR: Set LOAD_ALLOW_STAGING=1 for staging listing API load');
  process.exit(1);
}

const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 10);

const url = new URL('/api/listings?limit=5', base).href;
const result = await runConcurrentGets(url, { concurrency, durationSec });

console.log(
  JSON.stringify(
    {
      scenario: 'listings-read-staging',
      note: 'No POST create — read-only by design for live safety',
      ...result,
    },
    null,
    2
  )
);
