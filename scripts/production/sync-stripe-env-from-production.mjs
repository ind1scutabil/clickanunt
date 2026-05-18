#!/usr/bin/env node
/**
 * One-off: copy live Stripe vars from .env.production into .env (PM2 uses .env).
 * Run on VPS only. Does not print secret values.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function parse(path) {
  const o = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[t.slice(0, i).trim()] = v;
  }
  return o;
}

const keys = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

const prod = parse('.env.production');
const envPath = '.env';
const env = parse(envPath);
let lines = readFileSync(envPath, 'utf8').split('\n');
const updates = new Map();

for (const k of keys) {
  if (prod[k] && prod[k] !== env[k]) {
    updates.set(k, prod[k]);
  }
}

if (updates.size === 0) {
  console.log('No Stripe env updates needed.');
  process.exit(0);
}

lines = lines.map((line) => {
  const t = line.trim();
  if (!t || t.startsWith('#')) return line;
  const i = t.indexOf('=');
  if (i < 1) return line;
  const k = t.slice(0, i).trim();
  if (!updates.has(k)) return line;
  const v = updates.get(k);
  return `${k}="${String(v).replace(/"/g, '\\"')}"`;
});

for (const [k, v] of updates) {
  if (!lines.some((l) => l.trim().startsWith(`${k}=`))) {
    lines.push(`${k}="${String(v).replace(/"/g, '\\"')}"`);
  }
}

writeFileSync(envPath, lines.join('\n'));
for (const k of updates.keys()) {
  const v = updates.get(k);
  const mode =
    k.includes('SECRET_KEY') && v?.startsWith('sk_live_')
      ? 'live'
      : k.includes('SECRET_KEY') && v?.startsWith('sk_test_')
        ? 'test'
        : k.includes('WEBHOOK')
          ? 'webhook'
          : k.includes('PUBLISHABLE') && v?.startsWith('pk_live_')
            ? 'live-pk'
            : 'updated';
  console.log(`Updated ${k} (${mode})`);
}
