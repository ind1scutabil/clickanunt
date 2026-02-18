/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded before the application starts
 * Perfect for environment validation
 */

import { enforceEnvironment } from './lib/env-validator';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Next.js automatically loads .env files, so no need for dotenv import
    console.log('🔧 Environment loaded:', {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasStripePublic: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });
    enforceEnvironment();
  }
}
