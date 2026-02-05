/**
 * Feature Flags System
 * Server-side feature flag checks pentru control granular
 */

import { prisma } from './prisma';

// Cache în memorie pentru performance (5 minute TTL)
const flagCache = new Map<string, { value: boolean; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

/**
 * Verifică dacă un feature flag este enabled
 * Cu caching pentru performance
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  // Check cache
  const cached = flagCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });

    const value = flag?.enabled ?? false;

    // Update cache
    flagCache.set(key, {
      value,
      expires: Date.now() + CACHE_TTL,
    });

    return value;
  } catch (error) {
    console.error(`Feature flag check failed for "${key}":`, error);
    // Fail-safe: return false if DB is down
    return false;
  }
}

/**
 * Verifică multiple feature flags simultan
 */
export async function areFeaturesEnabled(keys: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    keys.map(async (key) => {
      results[key] = await isFeatureEnabled(key);
    })
  );

  return results;
}

/**
 * Clear cache pentru un flag specific sau toate
 */
export function clearFeatureFlagCache(key?: string): void {
  if (key) {
    flagCache.delete(key);
  } else {
    flagCache.clear();
  }
}

/**
 * Setează un feature flag (doar pentru OWNER)
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  description?: string,
  updatedBy?: string
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    create: {
      key,
      enabled,
      description,
      updatedBy,
    },
    update: {
      enabled,
      description: description || undefined,
      updatedBy,
      updatedAt: new Date(),
    },
  });

  // Clear cache
  clearFeatureFlagCache(key);
}

/**
 * Lista toate feature flags (pentru admin UI)
 */
export async function getAllFeatureFlags() {
  return prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });
}

// Predefined feature flag keys
export const FeatureFlags = {
  // Moderation
  AUTO_MODERATION: 'auto_moderation',
  MANUAL_REVIEW_REQUIRED: 'manual_review_required',
  STRICT_MODERATION: 'strict_moderation',
  
  // Search
  ADVANCED_SEARCH: 'advanced_search',
  SEARCH_SUGGESTIONS: 'search_suggestions',
  SAVED_SEARCHES: 'saved_searches',
  
  // Payments
  STRIPE_PAYMENTS: 'stripe_payments',
  FEATURED_LISTINGS: 'featured_listings',
  PREMIUM_ACCOUNTS: 'premium_accounts',
  
  // Social
  USER_REVIEWS: 'user_reviews',
  MESSAGING: 'messaging',
  FAVORITES: 'favorites',
  
  // Admin
  BULK_ACTIONS: 'bulk_actions',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AUDIT_LOG_EXPORT: 'audit_log_export',
} as const;
