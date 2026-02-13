/**
 * Cloudflare Configuration
 * 
 * Features:
 * - WAF rule management
 * - Rate limiting
 * - Bot protection (via Cloudflare)
 * - Real IP detection
 * - Edge caching
 */

export interface CloudflareConfig {
  zoneId: string;
  accountId: string;
  apiToken: string;
  accountEmail?: string;
}

/**
 * Cloudflare environment config
 */
export const CLOUDFLARE_CONFIG: CloudflareConfig = {
  zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  accountEmail: process.env.CLOUDFLARE_EMAIL,
};

/**
 * Real IP detection from Cloudflare headers
 */
export function getRealIP(headers: Headers): string {
  // Priority order: CF-Connecting-IP > X-Forwarded-For > X-Real-IP
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  return 'unknown';
}

/**
 * Get Cloudflare request info
 */
export function getCloudflareRequestInfo(headers: Headers): {
  realIP: string;
  country: string;
  rayID: string;
  isCloudflareBot: boolean;
  isCloudflare: boolean;
} {
  return {
    realIP: getRealIP(headers),
    country: headers.get('cf-ipcountry') || 'unknown',
    rayID: headers.get('cf-ray') || 'unknown',
    isCloudflareBot: headers.get('cf-bot-management-score') ? true : false,
    isCloudflare: !!headers.get('cf-ray'),
  };
}

/**
 * WAF rule levels
 */
export const WAF_LEVELS = {
  ESSENTIALS: 'essentials',    // Low false positives
  BALANCED: 'balanced',          // Moderate protection
  HIGH: 'high',                  // Strict protection
  PARANOID: 'paranoid',          // Maximum protection
} as const;

/**
 * Cloudflare cache zones
 */
export const CACHE_ZONES = {
  BYPASS: 0,                     // No caching
  SHORT: 300,                    // 5 minutes
  MEDIUM: 3600,                  // 1 hour
  LONG: 86400,                   // 24 hours
  VERY_LONG: 604800,             // 7 days
  MONTH: 2592000,                // 30 days
} as const;

/**
 * Cloudflare page rules patterns
 */
export const PAGE_RULES = {
  ADMIN: '/admin/*',
  API: '/api/*',
  STATIC: '/static/*',
  UPLOADS: '/uploads/*',
  HEALTH: '/api/health',
} as const;

/**
 * Rate limit thresholds (requests per period)
 */
export const RATE_LIMITS_CF = {
  GLOBAL: {
    requests: 1000,
    period: 60, // seconds
    countryExemption: false,
  },
  API: {
    requests: 100,
    period: 60,
    countryExemption: false,
  },
  LOGIN: {
    requests: 10,
    period: 300, // 5 minutes
    countryExemption: false,
  },
  SEARCH: {
    requests: 50,
    period: 60,
    countryExemption: true, // Different per country
  },
} as const;

/**
 * Threat score thresholds
 */
export const THREAT_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 50,
  CRITICAL: 75,
} as const;

/**
 * Bot detection settings
 */
export const BOT_DETECTION = {
  enableManaged: true,          // Cloudflare Managed Bot Fighting
  enableSuperBot: true,         // Super Bot Fight Mode
  enableChallenge: false,       // Show CAPTCHA
  enableBlock: true,            // Block known bad bots
  sensitivity: 'high',          // 'low' | 'medium' | 'high'
} as const;

/**
 * Cloudflare Workers configuration
 */
export const WORKERS_CONFIG = {
  routes: [
    { pattern: '/api/*', zone: 'production' },
    { pattern: '/admin/*', zone: 'admin' },
  ],
  environment: process.env.NODE_ENV || 'production',
  timeout: 30000, // 30 seconds
} as const;
