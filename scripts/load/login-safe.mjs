#!/usr/bin/env node
/**
 * Safe login load: only exercises GET /api/csrf (no credential brute-force).
 */
import { assertLoadTestAllowed, resolveBaseUrl, runConcurrentGets } from './lib/guard.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 10);

const url = new URL('/api/csrf', base).href;
const result = await runConcurrentGets(url, { concurrency, durationSec });

console.log(JSON.stringify({ scenario: 'login-safe-csrf', note: 'No POST /login', ...result }, null, 2));
