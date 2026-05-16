#!/usr/bin/env node
/**
 * Stripe webhook route liveness — invalid signature must return 400 (no payment processing).
 */
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const url = new URL('/api/payments/webhook', base).href;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 8);
const end = Date.now() + durationSec * 1000;
let completed = 0;
let ok = 0;
let errors = 0;
const latencies = [];

async function worker() {
  while (Date.now() < end) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.status === 400) ok += 1;
      else errors += 1;
    } catch {
      errors += 1;
    }
    latencies.push(performance.now() - t0);
    completed += 1;
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

console.log(
  JSON.stringify(
    {
      profile: 'stripe-webhook-invalid-sig',
      note: 'Expect HTTP 400 — verifies route alive without valid Stripe events',
      completed,
      expected400: ok,
      errors,
      errorRate: completed ? errors / completed : 0,
      latencyMs: { p95: Math.round(p95) },
    },
    null,
    2
  )
);
