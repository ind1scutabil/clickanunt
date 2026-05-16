#!/usr/bin/env node
/**
 * Shared entry for load profiles — parses env, guards prod, runs profile.
 */
import { resolveBaseUrl, assertLoadTestAllowed, requireStagingAuth } from './guard.mjs';
import { runLoadProfile, fetchGetMetrics, sampleProcessStats } from './metrics.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function executeProfile(name, buildUrl, options = {}) {
  const base = resolveBaseUrl();
  assertLoadTestAllowed(base);

  if (options.requireAuth) {
    requireStagingAuth();
  }

  const concurrency = Number(process.env.LOAD_CONCURRENCY ?? options.concurrency ?? 10);
  const durationSec = Number(process.env.LOAD_DURATION_SEC ?? options.durationSec ?? 15);
  const pid = process.env.LOAD_SAMPLE_PID?.trim();

  const before = sampleProcessStats(pid);
  const targetSample = buildUrl(base);

  const result = await runLoadProfile({
    name,
    concurrency,
    durationSec,
    requestFn: async () => {
      const init = options.headers ? { headers: options.headers() } : {};
      return fetchGetMetrics(buildUrl(base), init);
    },
  });

  const after = sampleProcessStats(pid);

  const report = {
    ...result,
    target: targetSample,
    processSample: pid ? { before, after } : { note: 'set LOAD_SAMPLE_PID to Node server PID for CPU/RSS' },
  };

  if (process.env.LOAD_WRITE_RESULTS === '1') {
    const dir = join(__dirname, '..', 'results');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify(report, null, 2));
    console.error(`Wrote ${file}`);
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}
