#!/usr/bin/env node
/**
 * Pre-deploy gate — blocks categories forbidden for live deploy.
 * Exit 0 = pass, 1 = block.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const BLOCK_PATTERNS = [
  { name: 'prisma schema change', re: /^prisma\/schema\.prisma$/m, diff: /^\+\s*(model |enum )/m },
  { name: 'new migration', re: /^prisma\/migrations\//m, diff: /^\+/m },
];

const WARN_FILES = [
  /^app\/components\//,
  /^app\/.*\.css$/,
  /^app\/globals/,
];

const ALLOW_PERF = [
  'app/page.tsx',
  'app/components/HomePageClient.tsx',
];

let failed = 0;
let warned = 0;

function block(msg) {
  console.log(`[BLOCK] ${msg}`);
  failed += 1;
}
function pass(msg) {
  console.log(`[PASS] ${msg}`);
}
function warn(msg) {
  console.log(`[WARN] ${msg}`);
  warned += 1;
}

let names = [];
try {
  const unstaged = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim();
  const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).trim();
  names = [...new Set([...unstaged.split('\n'), ...untracked.split('\n')].filter(Boolean))];
} catch {
  block('git diff failed');
}

if (names.length === 0) {
  pass('no uncommitted changes vs HEAD');
} else {
  warn(`${names.length} files to deploy (uncommitted + untracked)`);
}

for (const f of names) {
  if (f.includes('ecosystem.staging') || f.includes('STAGING_') && f.endsWith('.md')) {
    warn(`staging artifact in tree: ${f} (not used on prod PM2)`);
  }
  if (WARN_FILES.some((r) => r.test(f)) && !ALLOW_PERF.includes(f)) {
    warn(`UI path touched: ${f} — verify no layout/CSS change`);
  }
}

let diffAll = '';
try {
  diffAll = execSync('git diff HEAD', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
} catch {
  /* empty */
}

const prodEnvDiff = diffAll
  .split(/^diff --git /m)
  .filter((chunk) => /^a\/\.env\.production/m.test(chunk) || /^a\/\.env"?\s/m.test(chunk))
  .join('\n');
const activeEnvAdds = (chunk) =>
  chunk
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++') && !/^\+#/.test(l))
    .join('\n');

if (/STAGING_SITE=1/.test(activeEnvAdds(prodEnvDiff))) {
  block('diff enables STAGING_SITE in production env file');
}
if (/USE_REDIS_RATE_LIMIT=1/.test(activeEnvAdds(prodEnvDiff))) {
  block('diff forces USE_REDIS_RATE_LIMIT=1 in production env file');
}

const ecoDiff = diffAll.includes('ecosystem.config.js')
  ? diffAll.split('ecosystem.config.js')[1]?.slice(0, 3000) ?? ''
  : '';
if (/^\+[^/].*exec_mode:\s*['"]cluster['"]/m.test(ecoDiff)) {
  block('diff enables active PM2 cluster mode in ecosystem.config.js');
}

if (/prisma\/migrations\//.test(names.join('\n'))) {
  const migChanged = names.filter((n) => n.startsWith('prisma/migrations/'));
  if (migChanged.length) block(`migration files in deploy set: ${migChanged.join(', ')}`);
}

const eco = existsSync('ecosystem.config.js') ? readFileSync('ecosystem.config.js', 'utf8') : '';
if (/instances:\s*1/.test(eco) && /fork/.test(eco)) pass('ecosystem.config.js: single fork');
else block('ecosystem.config.js not single fork');

const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
pass(`rollback commit (current HEAD after commit): ${head}`);

console.log(JSON.stringify({ files: names.length, failed, warned, head }, null, 2));
process.exit(failed ? 1 : 0);
