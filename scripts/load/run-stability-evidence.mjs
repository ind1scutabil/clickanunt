#!/usr/bin/env node
/**
 * Safe local/staging load evidence — stops early on high error rate.
 * Never targets production without ALLOW_PROD_LOAD=1.
 *
 *   BASE_URL=http://127.0.0.1:3000 npm run load:stability-evidence
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';
import { runLoadProfile, fetchGetMetrics } from './lib/metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const MAX_ERROR_RATE = Number(process.env.LOAD_ABORT_ERROR_RATE ?? 0.05);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 15);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 12);

const profiles = [
  { name: 'homepage', path: '/' },
  { name: 'listings', path: '/listings' },
  { name: 'api-listings', path: '/api/listings?limit=10' },
  { name: 'api-health', path: '/api/health' },
  { name: 'messages-page', path: '/messages' },
];

const evidence = {
  baseUrl: base,
  sampledAt: new Date().toISOString(),
  maxErrorRate: MAX_ERROR_RATE,
  profiles: [],
  aborted: false,
};

for (const p of profiles) {
  const url = new URL(p.path, base).href;
  const result = await runLoadProfile({
    name: p.name,
    concurrency,
    durationSec,
    requestFn: () => fetchGetMetrics(url),
  });
  evidence.profiles.push({ ...result, target: url });
  console.log(`[${p.name}] errorRate=${result.errorRate} p95=${result.latencyMs.p95}ms`);

  if (result.errorRate > MAX_ERROR_RATE) {
    evidence.aborted = true;
    evidence.abortReason = `${p.name} errorRate ${result.errorRate} > ${MAX_ERROR_RATE}`;
    console.error(`ABORT: ${evidence.abortReason}`);
    break;
  }
}

const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `stability-evidence-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify(evidence, null, 2));
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.aborted ? 1 : 0);
