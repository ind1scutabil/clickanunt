#!/usr/bin/env node
/**
 * Read-only production safety checklist (local repo + optional SSH).
 * Does NOT deploy, mutate DB, or change production.
 *
 *   node scripts/production/safety-audit.mjs
 *   DEPLOY_SERVER=root@46.225.69.155 node scripts/production/safety-audit.mjs --ssh
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ssh = process.argv.includes('--ssh');
const server = process.env.DEPLOY_SERVER || 'root@46.225.69.155';
const deployDir = process.env.DEPLOY_DIR || '/var/www/clickanunt';

let failed = 0;

function pass(msg) {
  console.log(`[PASS] ${msg}`);
}
function fail(msg) {
  console.log(`[FAIL] ${msg}`);
  failed += 1;
}
function warn(msg) {
  console.log(`[WARN] ${msg}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  pass(`git branch: ${branch}`);
} catch {
  fail('not a git repository');
}

if (execSync('git status --porcelain', { encoding: 'utf8' }).trim()) {
  warn('working tree has uncommitted changes — deploy:prod will refuse until clean');
} else {
  pass('working tree clean (deploy:prod safe to run when approved)');
}

const eco = read('ecosystem.config.js');
if (/instances:\s*1/.test(eco) && /exec_mode:\s*['"]fork['"]/.test(eco)) {
  pass('ecosystem.config.js: instances=1 fork');
} else {
  fail('ecosystem.config.js: expected single fork instance');
}
if (/exec_mode:\s*['"]cluster['"]/.test(eco) && !/\/\/.*cluster/.test(eco.split('cluster')[0]?.slice(-80) ?? '')) {
  warn('ecosystem may enable cluster — verify commented cluster block only');
}

if (existsSync('scripts/deploy-prod-from-local.sh')) {
  const deploy = read('scripts/deploy-prod-from-local.sh');
  if (deploy.includes('git status --porcelain') && deploy.includes('deploy oprit')) {
    pass('deploy-prod-from-local.sh: refuses dirty working tree');
  } else {
    fail('deploy-prod-from-local.sh: missing dirty-tree guard');
  }
} else {
  fail('missing scripts/deploy-prod-from-local.sh');
}

if (existsSync('scripts/rollback.sh')) {
  pass('scripts/rollback.sh present (run on VPS: ./scripts/rollback.sh <commit>)');
} else {
  fail('missing scripts/rollback.sh');
}

const example = existsSync('.env.example') ? read('.env.example') : '';
const requiredHints = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'STRIPE_SECRET_KEY',
];
for (const key of requiredHints) {
  if (example.includes(key)) {
    pass(`.env.example documents ${key}`);
  } else {
    warn(`.env.example may not document ${key}`);
  }
}

if (read('lib/staging/site-mode.ts').includes('STAGING_SITE')) {
  pass('staging isolation module present (STAGING_SITE must be unset on prod)');
} else {
  warn('lib/staging/site-mode.ts not found');
}

if (ssh) {
  try {
    const flags = execSync(
      `ssh -o ConnectTimeout=10 -o BatchMode=yes ${server} 'grep -E "^STAGING_SITE=|^USE_REDIS_RATE_LIMIT=|^ENABLE_STAGING_LOAD_DIAGNOSTICS=" ${deployDir}/.env 2>/dev/null || echo NONE'`,
      { encoding: 'utf8' }
    ).trim();
    if (flags === 'NONE' || flags === '') {
      pass(`${server}: no staging/redis-diag flags in .env (grep)`);
    } else {
      fail(`${server}: staging/diag flags present: ${flags}`);
    }
    const pm2 = execSync(
      `ssh -o ConnectTimeout=10 -o BatchMode=yes ${server} 'pm2 describe clickanunt 2>/dev/null | grep -E "status|exec mode|max_memory" || true'`,
      { encoding: 'utf8' }
    ).trim();
    if (pm2.includes('online')) pass(`${server}: PM2 clickanunt online`);
    else warn(`${server}: PM2 status unclear: ${pm2}`);
  } catch (e) {
    fail(`SSH audit failed: ${e.message}`);
  }
} else {
  warn('Run with --ssh for live VPS flag check (read-only grep)');
}

console.log('');
if (failed > 0) {
  console.log(`Safety audit: ${failed} failure(s)`);
  process.exit(1);
}
console.log('Safety audit: OK (review WARN lines)');
