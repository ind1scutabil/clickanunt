#!/usr/bin/env node
/**
 * Staging Redis + distributed rate limit verification (read-only / test keys only).
 */
import { createRequire } from 'node:module';
import { resolveBaseUrl, assertValidationAllowed } from './lib/guard.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(process.cwd() + '/package.json');
const __dirname = dirname(fileURLToPath(import.meta.url));

const base = resolveBaseUrl();
assertValidationAllowed(base);

let failed = 0;
function pass(name, detail = {}) {
  console.log(`[PASS] ${name}`, Object.keys(detail).length ? JSON.stringify(detail) : '');
}
function fail(name, detail = {}) {
  failed += 1;
  console.log(`[FAIL] ${name}`, JSON.stringify(detail));
}

// 1) Direct Redis PING
const redisUrl = process.env.REDIS_URL?.trim();
if (!redisUrl) {
  fail('REDIS_URL set', { reason: 'REDIS_URL required for staging 10k tests' });
} else {
  pass('REDIS_URL set', { host: redisUrl.replace(/:[^:@]+@/, ':***@') });
  try {
    const Redis = require('ioredis');
    const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 8000 });
    await client.connect();
    const t0 = Date.now();
    const pong = await client.ping();
    pass('Redis PING', { pong, latencyMs: Date.now() - t0 });
    const testKey = `staging:rate:test:${Date.now()}`;
    await client.set(testKey, '1', 'EX', 30);
    const v = await client.get(testKey);
    if (v === '1') pass('Redis SET/GET test key');
    else fail('Redis SET/GET test key');
    await client.del(testKey);
    client.disconnect();
  } catch (e) {
    fail('Redis PING', { error: e instanceof Error ? e.message : String(e) });
  }
}

// 2) Health endpoint Redis (server-side)
try {
  const healthRes = await fetch(new URL('/api/health', base).href);
  const health = await healthRes.json();
  if (health.redis?.status === 'up') {
    pass('Server /api/health redis', health.redis);
  } else if (health.redis?.status === 'skipped') {
    fail('Server /api/health redis', {
      reason: 'REDIS_URL not set on server — set on staging .env and pm2 reload',
    });
  } else {
    fail('Server /api/health redis', health.redis ?? health);
  }
  if (health.database?.latencyMs != null) {
    pass('Server DB latency', { latencyMs: health.database.latencyMs });
  }
} catch (e) {
  fail('Server /api/health', { error: String(e) });
}

// 3) Distributed rate limit across two Node processes
if (redisUrl && process.env.USE_REDIS_RATE_LIMIT === '1') {
  const workerScript = join(__dirname, 'lib', 'rate-limit-worker-once.mjs');
  const env = { ...process.env, USE_REDIS_RATE_LIMIT: '1', REDIS_URL: redisUrl };
  const key = `staging:rl:probe:${Date.now()}`;

  function runWorker() {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [workerScript, key], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (d) => (out += d));
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(out));
        else resolve(JSON.parse(out));
      });
    });
  }

  try {
    const [a, b] = await Promise.all([runWorker(), runWorker()]);
    const total = (a.count || 0) + (b.count || 0);
    if (total >= 2) pass('Rate limit shared across processes', { workerA: a, workerB: b });
    else fail('Rate limit shared across processes', { workerA: a, workerB: b });
  } catch (e) {
    fail('Rate limit worker test', { error: String(e) });
  }
} else {
  console.log('[SKIP] Distributed rate limit cross-process (set USE_REDIS_RATE_LIMIT=1 on staging server and re-run)');
}

console.log('\n--- Summary ---', { failed, redisUrl: Boolean(redisUrl), useRedisRl: process.env.USE_REDIS_RATE_LIMIT });
process.exit(failed > 0 ? 1 : 0);
