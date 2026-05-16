#!/usr/bin/env node
/**
 * Read-only production smoke (GET only). Does not mutate data.
 *   BASE_URL=https://www.clickanunt.ro node scripts/production/prod-smoke.mjs
 */
import { resolveBaseUrl } from '../staging/lib/guard.mjs';

const base = process.env.BASE_URL?.trim() || 'https://www.clickanunt.ro';
const paths = [
  { name: 'homepage', path: '/' },
  { name: 'listings', path: '/listings' },
  { name: 'login', path: '/auth/login' },
  { name: 'messages', path: '/messages' },
  { name: 'api-health', path: '/api/health' },
  { name: 'api-listings', path: '/api/listings?limit=5' },
  { name: 'api-csrf', path: '/api/csrf' },
  { name: 'api-promotions', path: '/api/promotion-packages' },
];

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
    results.push({ name, path, error: String(e), ok: false });
    console.log(`[FAIL] ${name} ${e.message}`);
  }
}

console.log(JSON.stringify({ baseUrl: base, failed, results }, null, 2));
process.exit(failed ? 1 : 0);
