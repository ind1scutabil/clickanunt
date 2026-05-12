/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded before the application starts
 * Perfect for environment validation
 */

import { enforceEnvironment } from './lib/env-validator';
import { getStripePublishableKey, warnIfStripeMisconfiguredForProduction } from './lib/stripe-publishable-key';
import { getStripeSecretKeyRuntime } from './lib/stripe-env-runtime';
import { warnIfProductionUsesLocalDiskUploads } from './lib/storage-production-warn';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Next.js automatically loads .env files, so no need for dotenv import
    console.log('🔧 Environment loaded:', {
      hasStripeSecret: !!getStripeSecretKeyRuntime(),
      hasStripePublishable: !!getStripePublishableKey(),
    });
    enforceEnvironment();
    warnIfStripeMisconfiguredForProduction();
    warnIfProductionUsesLocalDiskUploads();
  }
}
