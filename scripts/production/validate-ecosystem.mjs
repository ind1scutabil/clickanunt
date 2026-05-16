#!/usr/bin/env node
/**
 * Validates ecosystem.config.js for current single-server production.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const file = join(root, 'ecosystem.config.js');
let failed = 0;

function pass(m) {
  console.log(`[PASS] ${m}`);
}
function fail(m) {
  console.log(`[FAIL] ${m}`);
  failed += 1;
}

let src;
try {
  src = readFileSync(file, 'utf8');
} catch {
  fail('ecosystem.config.js missing');
  process.exit(1);
}

if (/instances:\s*1/.test(src) && /exec_mode:\s*['"]fork['"]/.test(src)) {
  pass('single fork instance');
} else {
  fail('expected instances:1 and exec_mode:fork');
}

if (/exec_mode:\s*['"]cluster['"]/.test(src) && !src.includes('// exec_mode: \'cluster\'')) {
  const clusterActive = /^\s*exec_mode:\s*['"]cluster['"]/m.test(src);
  if (clusterActive) fail('cluster mode must not be active on production');
}

if (/max_memory_restart:\s*['"]\d+M['"]/.test(src)) {
  pass('max_memory_restart set');
} else {
  fail('max_memory_restart missing');
}

if (/kill_timeout:\s*\d+/.test(src)) {
  pass('graceful kill_timeout');
} else {
  fail('kill_timeout missing');
}

if (/max_restarts:\s*\d+/.test(src)) {
  pass('max_restarts set');
} else {
  fail('max_restarts missing');
}

if (/wait_ready:\s*false/.test(src)) {
  pass('wait_ready:false (Next.js start compatibility)');
} else {
  fail('wait_ready should be false for next start');
}

console.log(failed ? `\n${failed} failure(s)` : '\nEcosystem validation OK');
process.exit(failed ? 1 : 0);
