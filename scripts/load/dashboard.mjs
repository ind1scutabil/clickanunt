#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';
import { authHeaders } from './lib/guard.mjs';

await executeProfile(
  'dashboard-stats',
  (base) => new URL('/api/dashboard/stats', base).href,
  {
    requireAuth: true,
    concurrency: 8,
    headers: () => authHeaders(),
  }
);
