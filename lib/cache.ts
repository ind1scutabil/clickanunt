/**
 * Redis Caching Layer for 2M+ Users
 * 
 * Implements intelligent caching for:
 * - Listing queries (hot data)
 * - User profiles
 * - Search results
 * - Statistics
 */

import { getRedisClient, RedisUnavailableError } from './redis';
import type { Redis } from 'ioredis';

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  LISTING_DETAIL: 300,      // 5 minutes
  LISTING_LIST: 180,        // 3 minutes
  USER_PROFILE: 600,        // 10 minutes
  SEARCH_RESULTS: 120,      // 2 minutes
  STATISTICS: 300,          // 5 minutes
  HOT_LISTINGS: 60,         // 1 minute (frequently changing)
  CATEGORIES: 3600,         // 1 hour (rarely changes)
  CAR_DATA: 86400,          // 24 hours (static data)
} as const;

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

/**
 * Cache Manager with intelligent invalidation
 */
export class CacheManager {
  private redis: Redis | null = null;
  private useRedis: boolean = false;
  private localCache: Map<string, { value: any; expiry: number }> = new Map();

  constructor() {
    try {
      this.redis = getRedisClient();
      this.useRedis = true;
      console.log('✅ [Cache] Redis caching enabled');
    } catch (error) {
      console.warn('⚠️ [Cache] Redis unavailable, using memory cache');
      this.useRedis = false;
    }
  }

  /**
   * Generate cache key with namespace
   */
  private key(namespace: string, id: string): string {
    return `cache:${namespace}:${id}`;
  }

  /**
   * Get cached value
   */
  async get<T>(namespace: string, id: string): Promise<T | null> {
    const cacheKey = this.key(namespace, id);

    if (this.useRedis && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (error) {
        console.error('[Cache] Redis get error:', error);
        // Fall through to local cache
      }
    }

    // Fallback to local cache
    const localEntry = this.localCache.get(cacheKey);
    if (localEntry && localEntry.expiry > Date.now()) {
      return localEntry.value as T;
    }

    return null;
  }

  /**
   * Set cached value
   */
  async set<T>(
    namespace: string,
    id: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const cacheKey = this.key(namespace, id);
    const ttl = options.ttl || CACHE_TTL.LISTING_LIST;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
        
        // Add to tag sets for bulk invalidation
        if (options.tags) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, cacheKey);
            await this.redis.expire(`tag:${tag}`, ttl);
          }
        }
        return;
      } catch (error) {
        console.error('[Cache] Redis set error:', error);
        // Fall through to local cache
      }
    }

    // Fallback to local cache
    this.localCache.set(cacheKey, {
      value,
      expiry: Date.now() + ttl * 1000,
    });
  }

  /**
   * Delete cached value
   */
  async del(namespace: string, id: string): Promise<void> {
    const cacheKey = this.key(namespace, id);

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(cacheKey);
        return;
      } catch (error) {
        console.error('[Cache] Redis del error:', error);
      }
    }

    this.localCache.delete(cacheKey);
  }

  /**
   * Invalidate by tag (e.g., all listings for a user)
   */
  async invalidateByTag(tag: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
        }
        console.log(`♻️ [Cache] Invalidated ${keys.length} entries for tag: ${tag}`);
        return;
      } catch (error) {
        console.error('[Cache] Tag invalidation error:', error);
      }
    }

    // Local cache: clear all (no tag support in memory)
    this.localCache.clear();
  }

  /**
   * Invalidate all caches (use sparingly!)
   */
  async flush(): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('cache:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        console.log(`♻️ [Cache] Flushed ${keys.length} cache entries`);
        return;
      } catch (error) {
        console.error('[Cache] Flush error:', error);
      }
    }

    this.localCache.clear();
  }

  /**
   * Get or compute cached value
   */
  async getOrSet<T>(
    namespace: string,
    id: string,
    compute: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(namespace, id);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await compute();

    // Store in cache
    await this.set(namespace, id, value, options);

    return value;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{
    totalKeys: number;
    memoryUsage?: string;
    hitRate?: number;
  }> {
    if (this.useRedis && this.redis) {
      try {
        const info = await this.redis.info('stats');
        const keys = await this.redis.dbsize();
        
        return {
          totalKeys: keys,
          memoryUsage: 'Redis',
          hitRate: undefined, // Would need tracking
        };
      } catch (error) {
        console.error('[Cache] Stats error:', error);
      }
    }

    return {
      totalKeys: this.localCache.size,
      memoryUsage: 'Memory',
    };
  }
}

// Singleton instance
export const cache = new CacheManager();

/**
 * Cache wrapper for listing queries
 */
export async function cacheListingQuery<T>(
  queryKey: string,
  query: () => Promise<T>,
  userId?: string
): Promise<T> {
  const tags = userId ? [`user:${userId}`, 'listings'] : ['listings'];
  
  return cache.getOrSet(
    'listings',
    queryKey,
    query,
    { ttl: CACHE_TTL.LISTING_LIST, tags }
  );
}

/**
 * Cache wrapper for user profile
 */
export async function cacheUserProfile<T>(
  userId: string,
  query: () => Promise<T>
): Promise<T> {
  return cache.getOrSet(
    'user',
    userId,
    query,
    { ttl: CACHE_TTL.USER_PROFILE, tags: [`user:${userId}`] }
  );
}

/**
 * Invalidate listing caches for a user
 */
export async function invalidateUserListings(userId: string): Promise<void> {
  await cache.invalidateByTag(`user:${userId}`);
}

/**
 * Invalidate all listing caches
 */
export async function invalidateAllListings(): Promise<void> {
  await cache.invalidateByTag('listings');
}
