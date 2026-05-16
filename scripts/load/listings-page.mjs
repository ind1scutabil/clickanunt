#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';

await executeProfile('listings-page', (base) => new URL('/listings', base).href, {
  concurrency: 15,
});
