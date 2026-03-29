/**
 * CDN Configuration & Cache Control Headers
 * 
 * Sets appropriate cache headers for:
 * - Static assets (long-lived, immutable)
 * - Dynamic content (short-lived)
 * - API responses (no-cache)
 */

export interface CacheConfig {
  maxAge: number; // seconds
  sMaxAge?: number; // for shared caches (CDN)
  immutable?: boolean;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
}

/**
 * Cache configurations for different content types
 */
export const CACHE_CONFIGS = {
  // Static assets - cache forever (content hash changes URL)
  STATIC_IMMUTABLE: {
    maxAge: 31536000, // 1 year
    sMaxAge: 31536000,
    immutable: true,
    public: true,
  } as CacheConfig,

  // Images - long cache
  IMAGES: {
    maxAge: 86400, // 1 day
    sMaxAge: 604800, // 7 days (CDN)
    public: true,
  } as CacheConfig,

  // Fonts - long cache
  FONTS: {
    maxAge: 31536000,
    sMaxAge: 31536000,
    immutable: true,
    public: true,
  } as CacheConfig,

  // HTML pages - revalidate frequently
  HTML: {
    maxAge: 0,
    sMaxAge: 3600, // 1 hour (CDN)
    mustRevalidate: true,
    public: true,
  } as CacheConfig,

  // API responses - don't cache
  API: {
    noCache: true,
    noStore: true,
    private: true,
  } as CacheConfig,

  // User-specific data - private, short cache
  USER_DATA: {
    maxAge: 300, // 5 minutes
    private: true,
    mustRevalidate: true,
  } as CacheConfig,

  // Search results - cache briefly
  SEARCH: {
    maxAge: 300,
    sMaxAge: 600,
    public: true,
    mustRevalidate: true,
  } as CacheConfig,
};

/**
 * Convert cache config to cache-control header
 */
export function buildCacheControlHeader(config: CacheConfig): string {
  const parts: string[] = [];

  if (config.noStore) parts.push('no-store');
  if (config.noCache) parts.push('no-cache');
  if (config.private) parts.push('private');
  if (config.public && !config.private) parts.push('public');
  
  if (config.maxAge !== undefined && config.maxAge >= 0) {
    parts.push(`max-age=${config.maxAge}`);
  }
  if (config.sMaxAge !== undefined && config.sMaxAge >= 0) {
    parts.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.immutable) parts.push('immutable');
  if (config.mustRevalidate) parts.push('must-revalidate');
  if (config.proxyRevalidate) parts.push('proxy-revalidate');

  return parts.join(', ');
}

/**
 * Get cache config for file path
 */
export function getCacheConfigForPath(path: string): CacheConfig {
  // Static assets with hash (e.g., _next/static/chunks/main.abc123.js)
  if (path.match(/\/_next\/static\/.+\.[a-f0-9]+\.(js|css)$/)) {
    return CACHE_CONFIGS.STATIC_IMMUTABLE;
  }

  // Images
  if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
    return CACHE_CONFIGS.IMAGES;
  }

  // Fonts
  if (path.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
    return CACHE_CONFIGS.FONTS;
  }

  // API routes
  if (path.startsWith('/api/')) {
    return CACHE_CONFIGS.API;
  }

  // HTML pages
  if (path === '/' || path.endsWith('.html') || !path.includes('.')) {
    return CACHE_CONFIGS.HTML;
  }

  // Default: short cache
  return { maxAge: 3600, public: true };
}

/**
 * Response headers for CDN
 */
export const CDN_HEADERS = {
  // Cloudflare specific
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  'CF-Cache-Status': 'HIT',
  
  // Performance headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Compression
  'Content-Encoding': 'gzip, deflate, br',
  
  // Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https:; script-src 'self'",
};

/**
 * Configure Next.js for CDN
 * Add to next.config.ts:
 */
export const NEXT_CONFIG_CDN = {
  // Image optimization
  images: {
    domains: ['clickanunt.ro', 'cdn.clickanunt.ro'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Output as static exports for CDN
  output: process.env.USE_STATIC_EXPORT === 'true' ? 'export' : 'standalone',

  // Incremental Static Regeneration for dynamic content
  revalidate: {
    revalidateTag: 3600, // Seconds between revalidations
  },
};

/**
 * Example middleware for setting cache headers
 * 
 * Place in middleware.ts:
 * 
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next();
 *   const cacheConfig = getCacheConfigForPath(request.nextUrl.pathname);
 *   
 *   response.headers.set(
 *     'Cache-Control',
 *     buildCacheControlHeader(cacheConfig)
 *   );
 *   
 *   return response;
 * }
 */
