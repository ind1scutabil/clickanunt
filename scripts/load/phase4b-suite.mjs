#!/usr/bin/env node
/**
 * Phase 4B full evidence suite — staging only.
 * Runs isolation check, metrics snapshot, staged load, flow validators.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

if (!process.env.BASE_URL?.trim()) {
  console.error('ERROR: BASE_URL required (staging origin)');
  process.exit(1);
}

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      resolve({ code, out, err });
    });
  });
}

const evidence = {
  phase: '4B',
  startedAt: new Date().toISOString(),
  baseUrl: process.env.BASE_URL,
  steps: {},
};

console.log('=== Phase 4B: production isolation ===');
evidence.steps.isolation = await run('node', ['scripts/staging/verify-production-isolation.mjs']);

console.log('\n=== Metrics snapshot ===');
evidence.steps.metrics = await run('node', ['scripts/staging/collect-runtime-metrics.mjs']);

console.log('\n=== Staged concurrency load ===');
evidence.steps.stagedLoad = await run('node', ['scripts/load/run-staged-concurrency.mjs'], {
  LOAD_STAGED_PROFILES: process.env.LOAD_STAGED_PROFILES || 'homepage,search,health,listing,listings',
});

const readOnlyFlows = [
  ['validate:staging', ['node', 'scripts/staging/validate-readiness.mjs']],
  ['verify:critical-paths', ['node', 'scripts/stability/verify-critical-paths.mjs']],
  ['stripe-webhook-safe', ['node', 'scripts/load/stripe-webhook-safe.mjs']],
  ['payments-readonly', ['node', 'scripts/load/payments-readonly.mjs']],
];

if (process.env.LOAD_ALLOW_STAGING === '1' && process.env.LOAD_AUTH_BEARER) {
  readOnlyFlows.push(
    ['auth-session', ['node', 'scripts/load/auth-session.mjs']],
    ['messaging', ['node', 'scripts/load/messaging.mjs']],
    ['dashboard', ['node', 'scripts/load/dashboard.mjs']]
  );
}

evidence.steps.flows = {};
for (const [name, args] of readOnlyFlows) {
  console.log(`\n=== Flow: ${name} ===`);
  evidence.steps.flows[name] = await run(args[0], args[1]);
}

if (process.env.REDIS_URL) {
  console.log('\n=== Redis integration ===');
  evidence.steps.redis = await run('node', ['scripts/staging/verify-redis-integration.mjs']);
}

if (process.env.MESSAGING_METRICS_SECRET) {
  console.log('\n=== SSE cluster checks ===');
  evidence.steps.sse = await run('node', ['scripts/staging/verify-sse-cluster.mjs']);
}

evidence.completedAt = new Date().toISOString();
const dir = join(__dirname, 'results');
mkdirSync(dir, { recursive: true });
const file = join(dir, `phase4b-evidence-${Date.now()}.json`);
writeFileSync(file, JSON.stringify(evidence, null, 2));
console.log(`\nEvidence written: ${file}`);

const failed = Object.values(evidence.steps).some(
  (s) => s && typeof s === 'object' && 'code' in s && s.code !== 0
);
process.exit(failed ? 1 : 0);
