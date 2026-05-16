#!/usr/bin/env node
/**
 * Messaging polling simulation — GET conversations only (read-only).
 */
import { executeProfile } from './lib/profile-runner.mjs';
import { authHeaders } from './lib/guard.mjs';

await executeProfile(
  'messaging-conversations',
  (base) => new URL('/api/messages/conversations', base).href,
  {
    requireAuth: true,
    concurrency: 10,
    headers: () => authHeaders(),
  }
);
