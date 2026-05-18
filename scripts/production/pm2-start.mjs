#!/usr/bin/env node
/**
 * PM2 entry: align Stripe vars from .env.production, validate, then start Next.js.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
process.env.NODE_ENV = 'production';

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function main() {
  const syncScript = join(root, 'scripts/production/sync-stripe-env-from-production.mjs');
  if (existsSync(syncScript)) {
    await run('node', [syncScript]);
  }

  await run('npx', [
    'ts-node',
    '--transpile-only',
    '--project',
    'tsconfig.scripts.json',
    'scripts/production/validate-production-env.ts',
    '--strict',
  ]);

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['start'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error('[pm2-start] FATAL:', err.message);
  process.exit(1);
});
