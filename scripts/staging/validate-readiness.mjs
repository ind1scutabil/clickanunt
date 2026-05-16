#!/usr/bin/env node
/**
 * Read-only staging readiness validation (Redis, health, static assets, auth guards).
 * Does not POST/PUT/PATCH/DELETE. Does not mutate data.
 *
 * Usage:
 *   BASE_URL=https://staging.example.com node scripts/staging/validate-readiness.mjs
 *   REDIS_URL=redis://staging:6379 BASE_URL=... node scripts/staging/validate-readiness.mjs
 */

import { createRequire } from 'node:module';
import { resolveBaseUrl, assertValidationAllowed } from './lib/guard.mjs';

const require = createRequire(process.cwd() + '/package.json');

const base = resolveBaseUrl();
assertValidationAllowed(base);

const results = [];
let failed = 0;

function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
  if (!ok) failed += 1;
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}`, Object.keys(details).length ? JSON.stringify(details) : '');
}

async function fetchJson(path) {
  const url = new URL(path, base).href;
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { Accept: 'application/json' },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { url, res, body };
}

async function checkHealth() {
  const { res, body } = await fetchJson('/api/health');
  const dbLatency =
    body?.database?.latencyMs ?? (body?.database === 'up' ? null : undefined);
  const ok = res.status === 200 && body?.status === 'ok';
  record('GET /api/health', ok, {
    status: res.status,
    dbLatencyMs: dbLatency,
    redis: body?.redis ?? 'not_reported',
  });
  return body;
}

async function checkHomepage() {
  const url = new URL('/', base).href;
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const ok = res.status === 200 && html.length > 500;
  record('GET / (homepage)', ok, { status: res.status, bytes: html.length });
  return { res, html };
}

function extractCssHref(html) {
  const m = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/);
  return m?.[1] ?? null;
}

async function checkStaticCss(html) {
  const href = extractCssHref(html);
  if (!href) {
    record('GET /_next/static/css/*', false, { reason: 'no_css_link_in_homepage_html' });
    return;
  }
  const url = new URL(href, base).href;
  const res = await fetch(url, { redirect: 'follow' });
  const ok = res.status === 200;
  const ct = res.headers.get('content-type') || '';
  record('GET static CSS', ok, {
    path: href,
    status: res.status,
    contentType: ct,
  });
}

async function checkLocalhostTransportSecurity() {
  const host = base.hostname.toLowerCase();
  const isLoopback =
    host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
  if (!isLoopback) {
    record('localhost CSP/HSTS regression', true, { skipped: true, reason: 'not_loopback' });
    return;
  }
  const res = await fetch(new URL('/', base).href, { redirect: 'follow' });
  const csp = res.headers.get('content-security-policy') || '';
  const hsts = res.headers.get('strict-transport-security');
  const hasUpgrade = csp.includes('upgrade-insecure-requests');
  const ok = !hasUpgrade && !hsts;
  record('localhost CSP/HSTS regression', ok, {
    upgradeInsecureRequests: hasUpgrade,
    hsts: Boolean(hsts),
  });
}

async function checkAuthRejects() {
  const endpoints = [
    { path: '/api/messages/conversations', expect: [401, 403] },
    { path: '/api/users/me', expect: [401, 403] },
  ];
  for (const { path, expect } of endpoints) {
    const { res } = await fetchJson(path);
    const ok = expect.includes(res.status);
    record(`GET ${path} unauthenticated`, ok, { status: res.status, expected: expect });
  }
}

async function checkRedisDirect() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    record('Redis PING (direct)', true, {
      skipped: true,
      reason: 'REDIS_URL not set on validator — use server /api/health redis field',
    });
    return;
  }
  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    record('Redis PING (direct)', false, { reason: 'ioredis not available' });
    return;
  }
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 8000,
    lazyConnect: true,
  });
  try {
    await client.connect();
    const t0 = Date.now();
    const pong = await client.ping();
    const latencyMs = Date.now() - t0;
    record('Redis PING (direct)', pong === 'PONG', { latencyMs });
  } catch (e) {
    record('Redis PING (direct)', false, {
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }
  }
}

function checkRateLimitFlagDocumentation() {
  const flag = process.env.USE_REDIS_RATE_LIMIT;
  record('USE_REDIS_RATE_LIMIT env (informational)', true, {
    value: flag ?? '(unset)',
    note: 'Must be "1" on server to enable Redis rate limits; unset = in-memory only',
  });
}

async function main() {
  console.log(`\nStaging validation — ${base.href}\n`);

  checkRateLimitFlagDocumentation();
  const health = await checkHealth();
  await checkRedisDirect();

  if (health?.redis?.status === 'down') {
    record('Server Redis (from /api/health)', false, health.redis);
  } else if (health?.redis?.status === 'up') {
    record('Server Redis (from /api/health)', true, health.redis);
  } else {
    record('Server Redis (from /api/health)', true, {
      skipped: true,
      reason: 'REDIS_URL not configured on server',
    });
  }

  const { html } = await checkHomepage();
  await checkStaticCss(html);
  await checkLocalhostTransportSecurity();
  await checkAuthRejects();

  console.log('\n--- Summary ---');
  console.log(JSON.stringify({ baseUrl: base.href, passed: results.length - failed, failed, results }, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Validation crashed:', e);
  process.exit(1);
});
