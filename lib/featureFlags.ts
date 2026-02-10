/**
 * Feature Flags System
 * Control feature rollout and A/B testing
 */

import { prisma } from './prisma';

interface FeatureFlagCache {
  [key: string]: {
    enabled: boolean;
    timestamp: number;
  };
}

const cache: FeatureFlagCache = {};
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  // Check cache first
  if (cache[key] && Date.now() - cache[key].timestamp < CACHE_TTL) {
    return cache[key].enabled;
  }

  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    const enabled = flag?.enabled || false;

    // Update cache
    cache[key] = {
      enabled,
      timestamp: Date.now(),
    };

    return enabled;
  } catch (error) {
    console.error('Error checking feature flag:', error);
    return false;
  }
}

/**
 * Get feature flag with details
 */
export async function getFeatureFlag(key: string) {
  try {
    return await prisma.featureFlag.findUnique({
      where: { key },
    });
  } catch (error) {
    console.error('Error getting feature flag:', error);
    return null;
  }
}

/**
 * Set feature flag value (admin only)
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  description?: string,
  userId?: string
): Promise<void> {
  try {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {
        enabled,
        description: description || undefined,
        updatedAt: new Date(),
      },
      create: {
        key,
        enabled,
        description: description || `Feature flag: ${key}`,
      },
    });

    // Clear cache
    delete cache[key];
  } catch (error) {
    console.error('Error setting feature flag:', error);
    throw error;
  }
}

/**
 * Get all feature flags (admin only)
 */
export async function getAllFeatureFlags() {
  try {
    return prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  } catch (error) {
    console.error('Error getting all feature flags:', error);
    return [];
  }
}

/**
 * Clear feature flag cache
 */
export function clearFeatureFlagCache(): void {
  Object.keys(cache).forEach(key => delete cache[key]);
}

/**
 * Common feature flags
 */
export const FeatureFlags = {
  REGISTRATIONS_ENABLED: 'registrations_enabled',
  LISTINGS_ENABLED: 'listings_enabled',
  PAYMENTS_ENABLED: 'payments_enabled',
  PROMOTIONS_ENABLED: 'promotions_enabled',
  MAINTENANCE_MODE: 'maintenance_mode',
  AI_MODERATION: 'ai_moderation',
  ADVANCED_SEARCH: 'advanced_search',
  PREMIUM_LISTINGS: 'premium_listings',
  CHAT_SYSTEM: 'chat_system',
  TWO_FACTOR_AUTH: '2fa_enabled',
} as const;
