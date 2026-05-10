/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded before the application starts
 * Perfect for environment validation
 */

import { enforceEnvironment } from './lib/env-validator';
import { getStripePublishableKey, warnIfStripeMisconfiguredForProduction } from './lib/stripe-publishable-key';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Next.js automatically loads .env files, so no need for dotenv import
    console.log('🔧 Environment loaded:', {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasStripePublishable: !!getStripePublishableKey(),
    });
    enforceEnvironment();
    warnIfStripeMisconfiguredForProduction();
  }
}
