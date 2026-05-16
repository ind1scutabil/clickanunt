#!/usr/bin/env node
/**
 * Static audit: findMany without nearby take/skip (heuristic).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'app', 'api');
const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.ts')) scan(p);
  }
}

function scan(file) {
  const src = readFileSync(file, 'utf8');
  const rel = file.replace(process.cwd() + '/', '');
  const re = /findMany\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const slice = src.slice(m.index, m.index + 1600);
    const hasTake = /\btake\s*:/.test(slice);
    const hasSkip = /\bskip\s*:/.test(slice);
    const isAdmin = rel.includes('/admin/');
    if (!hasTake && !hasSkip) {
      findings.push({
        file: rel,
        risk: isAdmin ? 'admin-unbounded' : 'public-unbounded',
        note: 'findMany without take/skip in next ~1600 chars (heuristic — verify manually)',
      });
    }
  }
}

walk(root);

const publicRisk = findings.filter((f) => f.risk === 'public-unbounded');
const knownCapped = new Set([
  'app/api/favorites/route.ts',
  'app/api/listings/route.ts',
  'app/api/search/route.ts',
  'app/api/users/route.ts',
  'app/api/messages/conversations/route.ts',
]);
const unresolvedPublic = publicRisk.filter((f) => !knownCapped.has(f.file));
console.log(
  JSON.stringify(
    { total: findings.length, publicRisk, unresolvedPublic, all: findings },
    null,
    2
  )
);
process.exit(unresolvedPublic.length > 0 ? 1 : 0);
