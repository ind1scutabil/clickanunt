/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded before the application starts
 * Perfect for environment validation
 */

import { enforceEnvironment } from './lib/env-validator';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js runtime (not Edge)
    enforceEnvironment();
  }
}
