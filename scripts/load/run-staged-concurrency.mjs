#!/usr/bin/env node
/**
 * Staged load levels: 100 → 500 → 1000 → 2500 concurrent (read-only GET profiles).
 * Stops early if error rate > LOAD_MAX_ERROR_RATE (default 1%) or p95 > LOAD_MAX_P95_MS.
 */
import { spawn } from 'node:child_process';
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleProcessStats } from './lib/metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const LEVELS = (process.env.LOAD_STAGES || '100,500,1000,2500')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0);

const MAX_ERROR_RATE = Number(process.env.LOAD_MAX_ERROR_RATE ?? 0.01);
const MAX_P95_MS = Number(process.env.LOAD_MAX_P95_MS ?? 3000);
const DURATION_SEC = Number(process.env.LOAD_DURATION_SEC ?? 20);
const PROFILES = (process.env.LOAD_STAGED_PROFILES || 'homepage,search,health').split(',').map((s) => s.trim());
const SCRIPT_MAP = {
  homepage: 'homepage.mjs',
  search: 'search.mjs',
  health: 'health.mjs',
  listings: 'listings-page.mjs',
  listing: 'listing.mjs',
};

const pid = process.env.LOAD_SAMPLE_PID?.trim();
const results = { baseUrl: base.href, stages: [], aborted: false, abortReason: null };

function run(script, concurrency) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [join(__dirname, script)], {
      env: {
        ...process.env,
        BASE_URL: base.href,
        LOAD_CONCURRENCY: String(concurrency),
        LOAD_DURATION_SEC: String(DURATION_SEC),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(out.slice(0, 500)));
      else {
        try {
          resolve(JSON.parse(out));
        } catch {
          resolve({ raw: out });
        }
      }
    });
  });
}

for (const concurrency of LEVELS) {
  const stage = { concurrency, durationSec: DURATION_SEC, profiles: {}, processSample: sampleProcessStats(pid) };
  let stageFailed = false;

  for (const name of PROFILES) {
    const script = SCRIPT_MAP[name];
    if (!script) continue;
    if (name === 'listing' && !process.env.LOAD_LISTING_ID) continue;
    try {
      stage.profiles[name] = await run(script, concurrency);
      const p = stage.profiles[name];
      const errRate = p.errorRate ?? (p.errors && p.completed ? p.errors / p.completed : 0);
      const p95 = p.latencyMs?.p95 ?? 0;
      if (errRate > MAX_ERROR_RATE) {
        results.aborted = true;
        results.abortReason = `${name} error rate ${errRate} > ${MAX_ERROR_RATE} at concurrency ${concurrency}`;
        stageFailed = true;
      }
      if (p95 > MAX_P95_MS) {
        results.aborted = true;
        results.abortReason = `${name} p95 ${p95}ms > ${MAX_P95_MS} at concurrency ${concurrency}`;
        stageFailed = true;
      }
    } catch (e) {
      stage.profiles[name] = { error: e.message };
      stageFailed = true;
      results.aborted = true;
      results.abortReason = e.message;
    }
  }

  results.stages.push(stage);
  console.log(`\n=== Concurrency ${concurrency} ===`);
  console.log(JSON.stringify(stage, null, 2));
  if (stageFailed) {
    console.error(`\nSTOP: ${results.abortReason}`);
    break;
  }
}

const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `staged-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({ ...results, resultsFile: outFile }, null, 2));
console.log(`\nWrote ${outFile}`);
process.exit(results.aborted ? 1 : 0);
