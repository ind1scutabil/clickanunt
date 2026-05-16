#!/usr/bin/env node
/**
 * SSE cluster readiness checks (read-only). Full cross-worker proof requires manual 2-browser test.
 *
 * Env:
 *   BASE_URL — staging origin
 *   MESSAGING_METRICS_SECRET — must match server
 *   STAGING_METRICS_URLS — optional comma URLs (e.g. http://127.0.0.1:3000) if probing each worker
 *   LOAD_AUTH_BEARER — optional short SSE connect test
 */
import { resolveBaseUrl, assertValidationAllowed } from './lib/guard.mjs';

const base = resolveBaseUrl();
assertValidationAllowed(base);

let failed = 0;
function pass(msg, d = {}) {
  console.log(`[PASS] ${msg}`, Object.keys(d).length ? JSON.stringify(d) : '');
}
function fail(msg, d = {}) {
  failed += 1;
  console.log(`[FAIL] ${msg}`, JSON.stringify(d));
}

if (process.env.MESSAGING_DISABLE_REDIS === '1') {
  fail('MESSAGING_DISABLE_REDIS', { reason: 'must be unset on staging cluster' });
} else {
  pass('MESSAGING_DISABLE_REDIS not set');
}

const secret = process.env.MESSAGING_METRICS_SECRET?.trim();
if (!secret) {
  console.log('[SKIP] stream-metrics (set MESSAGING_METRICS_SECRET on server and env to probe)');
} else {
  const urls = (process.env.STAGING_METRICS_URLS?.trim() || base.origin).split(',').map((u) => u.trim());
  for (const origin of urls) {
    try {
      const res = await fetch(`${origin.replace(/\/$/, '')}/api/messages/stream-metrics`, {
        headers: { 'x-messaging-metrics-secret': secret },
      });
      const body = await res.json();
      if (res.ok && body.instance != null) {
        pass(`stream-metrics ${origin}`, {
          instance: body.instance,
          activeSseClients: body.activeSseClients,
          redisPublishes: body.redisPublishes,
        });
      } else {
        fail(`stream-metrics ${origin}`, { status: res.status, body });
      }
    } catch (e) {
      fail(`stream-metrics ${origin}`, { error: String(e) });
    }
  }
}

const healthRes = await fetch(new URL('/api/health', base).href);
const health = await healthRes.json();
if (health.redis?.status === 'up') pass('Redis up for messaging bus', health.redis);
else if (!process.env.REDIS_URL) {
  console.log('[WARN] Set REDIS_URL on server for cluster SSE fanout');
} else {
  fail('Redis for messaging', health.redis ?? 'not reported');
}

if (process.env.LOAD_ALLOW_STAGING === '1' && process.env.LOAD_AUTH_BEARER) {
  const token = process.env.LOAD_AUTH_BEARER.trim();
  const url = new URL(`/api/messages/events?token=${encodeURIComponent(token)}`, base).href;
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 5000);
  try {
    const t0 = performance.now();
    const res = await fetch(url, { signal: ac.signal });
    if (res.status === 200) {
      pass('SSE connect (5s hold)', { connectMs: Math.round(performance.now() - t0) });
    } else {
      fail('SSE connect', { status: res.status });
    }
  } catch (e) {
    if (e?.name === 'AbortError') pass('SSE connect (5s hold, aborted as expected)');
    else fail('SSE connect', { error: String(e) });
  }
} else {
  console.log('[SKIP] SSE hold test (LOAD_ALLOW_STAGING=1 + LOAD_AUTH_BEARER)');
}

console.log(`
Manual cluster proof (required before production cluster):
  1) pm2 start ecosystem.staging.cluster.config.js (2 instances)
  2) User A and B logged in, open /dashboard/messages
  3) Send message A→B — must appear without refresh
  4) pm2 logs — check both instance ids saw redis publish/delivery
  5) No duplicate message rows in DB for single send
`);

console.log('--- Summary ---', { failed });
process.exit(failed > 0 ? 1 : 0);
