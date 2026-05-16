#!/usr/bin/env node
/** Validates session — GET /api/users/me (read-only). */
import { executeProfile } from './lib/profile-runner.mjs';
import { authHeaders } from './lib/guard.mjs';

await executeProfile('auth-session', (base) => new URL('/api/users/me', base).href, {
  requireAuth: true,
  concurrency: 10,
  headers: () => authHeaders(),
});
