#!/usr/bin/env node
/**
 * Local / CI preflight for staging deploy — no SSH, no migrate, no deploy.
 *
 * Exits 1 on any failed check. Never prints secret values.
 */

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runStagingDeployPreflight,
  sanitizeForLog,
} from './lib/deploy-preflight.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function git(args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return { status: r.status ?? 1, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}

const pm2Config =
  process.env.STAGING_PM2_CONFIG || path.join(root, 'ecosystem.staging.config.js');

const status = git(['status', '--porcelain']);
const head = git(['rev-parse', 'HEAD']);
const expectedSha = process.env.STAGING_EXPECTED_SHA?.trim() || head.stdout;

const input = {
  confirmStagingDeploy: process.env.CONFIRM_STAGING_DEPLOY,
  stagingDeployServer: process.env.STAGING_DEPLOY_SERVER,
  stagingDeployDir: process.env.STAGING_DEPLOY_DIR,
  stagingDomain: process.env.STAGING_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL,
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  e2eDisableRateLimit: process.env.E2E_DISABLE_RATE_LIMIT,
  clickanuntE2eServer: process.env.CLICKANUNT_E2E_SERVER,
  nodeEnv: process.env.NODE_ENV || 'production',
  expectedSha,
  actualSha: head.stdout,
  workingTreeClean: status.status === 0 && status.stdout === '',
  backupVerified: process.env.STAGING_BACKUP_VERIFIED === '1',
  pm2ConfigExists: existsSync(pm2Config),
  portFree:
    process.env.STAGING_PORT_FREE === '0'
      ? false
      : process.env.STAGING_PORT_FREE === '1'
        ? true
        : undefined,
  migrationStatusOk:
    process.env.STAGING_MIGRATION_OK === '0'
      ? false
      : process.env.STAGING_MIGRATION_OK === '1'
        ? true
        : undefined,
  allowStagingOnProdHost: process.env.ALLOW_STAGING_ON_PROD_HOST,
};

const result = runStagingDeployPreflight(input);

console.log('[staging:preflight] sanitized inputs:');
for (const [k, v] of Object.entries({
  CONFIRM_STAGING_DEPLOY: input.confirmStagingDeploy,
  STAGING_DEPLOY_SERVER: input.stagingDeployServer,
  STAGING_DOMAIN: input.stagingDomain,
  STAGING_DATABASE_URL: input.stagingDatabaseUrl,
  STRIPE_SECRET_KEY: input.stripeSecretKey,
  NODE_ENV: input.nodeEnv,
  HEAD: input.actualSha,
  STAGING_EXPECTED_SHA: expectedSha,
  PM2_CONFIG: pm2Config,
})) {
  console.log(`  ${k}=${sanitizeForLog(k, v)}`);
}

if (!result.ok) {
  console.error('[staging:preflight] FAILED:');
  for (const issue of result.issues) {
    console.error(`  [${issue.code}] ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  '[staging:preflight] OK — safe to proceed only after real host/DB/domain are provisioned.'
);
process.exit(0);
