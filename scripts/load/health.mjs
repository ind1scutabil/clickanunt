#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';

await executeProfile('health', (base) => new URL('/api/health', base).href, {
  concurrency: 5,
});
