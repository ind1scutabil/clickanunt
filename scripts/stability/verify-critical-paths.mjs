#!/usr/bin/env node
/**
 * Read-only critical path checks (no auth mutations, no production by default).
 */
import { resolveBaseUrl, assertValidationAllowed } from '../staging/lib/guard.mjs';

const base = resolveBaseUrl();
assertValidationAllowed(base);

const paths = [
  { name: 'homepage', path: '/' },
  { name: 'listings', path: '/listings' },
  { name: 'listings-new', path: '/listings/new' },
  { name: 'messages-page', path: '/messages' },
  { name: 'dashboard-page', path: '/dashboard' },
  { name: 'login-page', path: '/auth/login' },
  { name: 'api-health', path: '/api/health' },
  { name: 'api-listings', path: '/api/listings?limit=5' },
  { name: 'api-promotion-packages', path: '/api/promotion-packages' },
  { name: 'api-csrf', path: '/api/csrf' },
];

const listingId = process.env.LOAD_LISTING_ID?.trim();
if (listingId) {
  paths.push({ name: 'listing-detail', path: `/listings/${listingId}` });
}

let failed = 0;
const results = [];

for (const { name, path } of paths) {
  const url = new URL(path, base).href;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status >= 200 && res.status < 400;
    if (!ok) failed += 1;
    results.push({ name, path, status: res.status, ok });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${res.status}`);
  } catch (e) {
    failed += 1;
    results.push({ name, path, error: e instanceof Error ? e.message : String(e), ok: false });
    console.log(`[FAIL] ${name} ${e}`);
  }
}

console.log(JSON.stringify({ baseUrl: base.href, failed, results }, null, 2));
process.exit(failed > 0 ? 1 : 0);
