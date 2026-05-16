#!/usr/bin/env node
/**
 * Run public read-only load profiles sequentially (staging/local).
 * Skips auth/SSE profiles unless LOAD_ALLOW_STAGING=1 + LOAD_AUTH_BEARER.
 */
import { spawn } from 'node:child_process';
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const durationSec = process.env.LOAD_DURATION_SEC ?? '12';
const concurrency = process.env.LOAD_CONCURRENCY ?? '10';

function run(script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      BASE_URL: base.href,
      LOAD_DURATION_SEC: durationSec,
      LOAD_CONCURRENCY: concurrency,
      ...extraEnv,
    };
    const child = spawn('node', [join(__dirname, script)], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${script} exit ${code}: ${err || out}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ raw: out, stderr: err });
      }
    });
  });
}

const publicProfiles = [
  'homepage.mjs',
  'listings-page.mjs',
  'search.mjs',
  'payments-readonly.mjs',
  'health.mjs',
];

if (process.env.LOAD_LISTING_ID) {
  publicProfiles.push('listing.mjs', 'listing-images.mjs');
}

const results = { baseUrl: base.href, profiles: {}, skipped: [] };

for (const script of publicProfiles) {
  const name = script.replace('.mjs', '');
  try {
    results.profiles[name] = await run(script);
  } catch (e) {
    results.profiles[name] = { error: e.message };
  }
}

if (process.env.LOAD_ALLOW_STAGING === '1' && process.env.LOAD_AUTH_BEARER) {
  for (const script of ['messaging.mjs', 'dashboard.mjs', 'sse.mjs']) {
    const name = script.replace('.mjs', '');
    try {
      results.profiles[name] = await run(script);
    } catch (e) {
      results.profiles[name] = { error: e.message };
    }
  }
} else {
  results.skipped.push('messaging', 'dashboard', 'sse (need LOAD_ALLOW_STAGING=1 + LOAD_AUTH_BEARER)');
}

const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `run-all-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify(results, null, 2));

console.log(JSON.stringify({ ...results, resultsFile: outFile }, null, 2));
