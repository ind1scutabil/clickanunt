#!/usr/bin/env node
/**
 * Pre-flight: ensure load/staging targets are not production.
 */
import { resolveBaseUrl, isProductionHost } from './lib/guard.mjs';

const base = resolveBaseUrl();
let failed = 0;

if (isProductionHost(base)) {
  if (process.env.ALLOW_PROD_LOAD !== '1' && process.env.ALLOW_PROD_VALIDATION !== '1') {
    console.error('[FAIL] BASE_URL is production — use staging subdomain');
    failed += 1;
  } else {
    console.warn('[WARN] Production URL with explicit opt-in — not recommended for Phase 4B');
  }
} else {
  console.log('[PASS] BASE_URL is not clickanunt.ro production host');
}

const dbUrl = process.env.DATABASE_URL || '';
if (/clickanunt\.ro|46\.225\.69\.155/.test(dbUrl)) {
  console.error('[FAIL] DATABASE_URL looks like production');
  failed += 1;
} else if (dbUrl) {
  console.log('[PASS] DATABASE_URL does not match known production patterns');
} else {
  console.log('[SKIP] DATABASE_URL not set on runner (set on staging server only)');
}

if (process.env.STAGING_SITE === '1') {
  console.log('[PASS] STAGING_SITE=1');
} else {
  console.log('[INFO] Set STAGING_SITE=1 on staging PM2 env for noindex');
}

try {
  const robotsRes = await fetch(new URL('/robots.txt', base).href);
  const text = await robotsRes.text();
  if (process.env.STAGING_SITE === '1' && text.includes('Disallow: /')) {
    console.log('[PASS] robots.txt blocks all (staging)');
  } else if (!process.env.STAGING_SITE) {
    console.log('[INFO] robots.txt fetched — enable STAGING_SITE=1 on server for noindex');
  }
} catch (e) {
  console.log('[WARN] robots.txt fetch failed', e);
}

process.exit(failed > 0 ? 1 : 0);
