#!/usr/bin/env node
/** Single Redis INCR for cross-process rate-limit probe (staging only). */
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');

const key = process.argv[2];
if (!key || !process.env.REDIS_URL?.trim()) {
  console.error('missing key or REDIS_URL');
  process.exit(1);
}

const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
const lua = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  return current
`;
const count = await redis.eval(lua, 1, key, 60000);
redis.disconnect();
console.log(JSON.stringify({ count: Number(count) }));
