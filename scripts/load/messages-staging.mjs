#!/usr/bin/env node
/**
 * Staging-only: GET conversations list (requires LOAD_AUTH_COOKIE or Bearer).
 * Refuses production unless ALLOW_PROD_LOAD_TEST=1.
 */
import { assertLoadTestAllowed, resolveBaseUrl } from './lib/guard.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

if (process.env.LOAD_ALLOW_STAGING !== '1') {
  console.error('ERROR: Set LOAD_ALLOW_STAGING=1 to run authenticated messaging load');
  process.exit(1);
}

const token = process.env.LOAD_AUTH_BEARER?.trim();
const cookie = process.env.LOAD_AUTH_COOKIE?.trim();
if (!token && !cookie) {
  console.error('ERROR: LOAD_AUTH_BEARER or LOAD_AUTH_COOKIE required');
  process.exit(1);
}

const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 10);
const end = Date.now() + durationSec * 1000;
let completed = 0;
let errors = 0;

const headers = { Accept: 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;
if (cookie) headers.Cookie = cookie;

async function worker() {
  const url = new URL('/api/messages/conversations', base).href;
  while (Date.now() < end) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) errors += 1;
    } catch {
      errors += 1;
    }
    completed += 1;
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(
  JSON.stringify(
    {
      scenario: 'messages-conversations',
      concurrency,
      durationSec,
      completed,
      errors,
      rps: (completed / durationSec).toFixed(1),
    },
    null,
    2
  )
);
