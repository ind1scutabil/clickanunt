#!/usr/bin/env node
/**
 * Read-only payment/promotion validation — no intents, no webhooks, no purchases.
 */
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';
import { runLoadProfile, fetchGetMetrics } from './lib/metrics.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const endpoints = [
  { name: 'promotion-packages', path: '/api/promotion-packages' },
  { name: 'stripe-publishable-key', path: '/api/payments/stripe-publishable-key' },
];

const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 8);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 10);

const results = [];
for (const ep of endpoints) {
  const url = new URL(ep.path, base).href;
  const r = await runLoadProfile({
    name: ep.name,
    concurrency,
    durationSec,
    requestFn: () => fetchGetMetrics(url),
  });
  results.push({ ...r, url });
}

console.log(JSON.stringify({ profile: 'payments-readonly', results }, null, 2));
