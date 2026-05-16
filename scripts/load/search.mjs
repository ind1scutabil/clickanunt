#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';

const q = process.env.LOAD_SEARCH_Q?.trim() || 'auto';

await executeProfile(
  'search',
  (base) => new URL(`/api/listings?q=${encodeURIComponent(q)}&limit=20`, base).href,
  { concurrency: 15 }
);
