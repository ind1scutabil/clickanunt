#!/usr/bin/env node
/**
 * Read-only codebase analysis for load/bottleneck report (no network, no DB writes).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

function countInFiles(files, pattern) {
  let n = 0;
  const hits = [];
  for (const f of files) {
    const c = readFileSync(f, 'utf8');
    const m = c.match(pattern);
    if (m?.length) {
      n += m.length;
      hits.push(relative(ROOT, f));
    }
  }
  return { count: n, files: [...new Set(hits)].slice(0, 20) };
}

const apiFiles = walk(join(ROOT, 'app/api'));
const libFiles = walk(join(ROOT, 'lib'));

const findManyInclude = countInFiles(apiFiles, /findMany\([\s\S]*?include:/g);
const prismaFindMany = countInFiles(apiFiles, /prisma\.\w+\.findMany/g);

const schema = read('prisma/schema.prisma');
const indexCount = (schema.match(/@@index/g) || []).length;
const listingIndexes = (schema.match(/model Listing[\s\S]*?^}/m)?.[0].match(/@@index/g) || []).length;

const ecosystem = read('ecosystem.config.js');

const report = {
  analyzedAt: new Date().toISOString(),
  apiRouteFiles: apiFiles.filter((f) => f.endsWith('route.ts')).length,
  prismaIndexTotal: indexCount,
  listingModelIndexes: listingIndexes,
  prismaFindManyInApi: prismaFindMany.count,
  findManyWithIncludeInApi: findManyInclude.count,
  findManyWithIncludeSamples: findManyInclude.files,
  pm2: {
    instances: ecosystem.match(/instances:\s*(\d+|'max')/)?.[1] ?? 'unknown',
    maxMemoryRestart: ecosystem.match(/max_memory_restart:\s*'([^']+)'/)?.[1] ?? 'unknown',
    execMode: ecosystem.match(/exec_mode:\s*'([^']+)'/)?.[1] ?? 'fork',
  },
  sse: {
    route: 'app/api/messages/events/route.ts',
    heartbeatMs: 25_000,
    metricsRoute: 'app/api/messages/stream-metrics/route.ts (MESSAGING_METRICS_SECRET)',
  },
  listingsApi: {
    file: 'app/api/listings/route.ts',
    ownerIncludeOnList: true,
    ftsFile: 'lib/listing-fts-query.ts',
  },
  dashboardStats: {
    file: 'app/api/dashboard/stats/route.ts',
    note: 'findMany all user listings for views sum — potential N rows at scale',
  },
  storage: {
    file: 'lib/storage.ts',
    s3WhenCredentialsSet: true,
    localFallback: 'lib/storage-local.ts',
  },
  rateLimit: {
    default: 'lib/rateLimit.ts in-memory',
    redisFlag: 'USE_REDIS_RATE_LIMIT=1',
  },
};

console.log(JSON.stringify(report, null, 2));
