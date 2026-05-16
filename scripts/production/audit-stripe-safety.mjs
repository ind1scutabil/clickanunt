#!/usr/bin/env node
/**
 * Read-only Stripe webhook safety audit (source grep, no network).
 */
import { readFileSync } from 'node:fs';

const files = [
  'app/api/payments/webhook/route.ts',
  'lib/stripe.ts',
];

let failed = 0;
const checks = [];

function record(name, ok, note = '') {
  checks.push({ name, ok, note });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${note ? ` — ${note}` : ''}`);
  if (!ok) failed += 1;
}

for (const f of files) {
  let src;
  try {
    src = readFileSync(f, 'utf8');
  } catch {
    record(`read ${f}`, false, 'missing');
    continue;
  }
  if (f.includes('webhook')) {
    record('signature required', /stripe-signature/.test(src) && /Missing signature/.test(src));
    record('constructEvent / verify', /verifyWebhookSignature|constructEvent/.test(src));
    record('idempotency key', /stripe:webhook:event/.test(src) && /\bNX\b/.test(src));
    record('payment_failed handler', /payment_failed/.test(src));
    record('no raw card logging', !/card\.number|payment_method_details\.card\.number/.test(src));
  }
  if (f.includes('stripe.ts')) {
    record('webhook secret env', /STRIPE_WEBHOOK_SECRET/.test(src));
  }
}

console.log(JSON.stringify({ checks, failed }, null, 2));
process.exit(failed ? 1 : 0);
