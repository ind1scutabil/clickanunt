#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';

await executeProfile('homepage', (base) => new URL('/', base).href, {
  concurrency: 20,
});
