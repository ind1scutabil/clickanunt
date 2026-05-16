#!/usr/bin/env node
/**
 * Snapshot runtime metrics from staging (read-only HTTP + optional Redis).
 */
import { resolveBaseUrl, assertValidationAllowed } from './lib/guard.mjs';
import { createRequire } from 'node:module';
import { sampleProcessStats } from '../load/lib/metrics.mjs';

const require = createRequire(process.cwd() + '/package.json');
const base = resolveBaseUrl();
assertValidationAllowed(base);

const snapshot = {
  collectedAt: new Date().toISOString(),
  baseUrl: base.href,
  process: sampleProcessStats(process.env.LOAD_SAMPLE_PID?.trim()),
  health: null,
  redis: null,
  streamMetrics: [],
};

const t0 = performance.now();
const healthRes = await fetch(new URL('/api/health', base).href);
snapshot.health = {
  status: healthRes.status,
  latencyMs: Math.round(performance.now() - t0),
  body: await healthRes.json(),
};

const redisUrl = process.env.REDIS_URL?.trim();
if (redisUrl) {
  try {
    const Redis = require('ioredis');
    const r = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
    const p0 = performance.now();
    await r.ping();
    snapshot.redis = { pingMs: Math.round(performance.now() - p0) };
    await r.quit();
  } catch (e) {
    snapshot.redis = { error: e instanceof Error ? e.message : String(e) };
  }
}

const secret = process.env.MESSAGING_METRICS_SECRET?.trim();
if (secret) {
  const urls = (process.env.STAGING_METRICS_URLS || base.origin).split(',').map((u) => u.trim());
  for (const origin of urls) {
    try {
      const res = await fetch(`${origin.replace(/\/$/, '')}/api/messages/stream-metrics`, {
        headers: { 'x-messaging-metrics-secret': secret },
      });
      snapshot.streamMetrics.push({ origin, status: res.status, body: await res.json() });
    } catch (e) {
      snapshot.streamMetrics.push({ origin, error: String(e) });
    }
  }
}

console.log(JSON.stringify(snapshot, null, 2));
