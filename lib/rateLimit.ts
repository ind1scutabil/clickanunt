/**
 * Rate Limiting pentru protecție bruteforce
 */

import {
  UPLOAD_RATE_LIMIT_AUTH_PER_HOUR,
  UPLOAD_RATE_LIMIT_IP_PER_HOUR,
} from '@/lib/infra/production-limits';
import { isE2eRateLimitBypassEnabled } from '@/lib/e2e-rate-limit-bypass';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Curăță intrările expirate din store
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

// Curăță automat la fiecare 5 minute.
// unref so this background timer does not keep the Node process alive
// (Jest unit tests import this module and would otherwise hang after PASS).
const rateLimitCleanupInterval = setInterval(cleanExpiredEntries, 5 * 60 * 1000);
if (typeof rateLimitCleanupInterval.unref === 'function') {
  rateLimitCleanupInterval.unref();
}

/** Clear the module cleanup timer (tests / graceful shutdown). */
export function stopRateLimitCleanup(): void {
  clearInterval(rateLimitCleanupInterval);
}

export interface RateLimitConfig {
  windowMs: number; // Fereastra de timp în ms
  maxRequests: number; // Număr maxim de request-uri
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Peek current usage without consuming a slot (for publish: check before success).
 */
export function peekRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  if (!store[key] || store[key].resetTime < now) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
    };
  }

  const count = store[key].count;
  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);

  return {
    allowed,
    remaining,
    resetTime: store[key].resetTime,
    retryAfter: allowed
      ? undefined
      : Math.max(1, Math.ceil((store[key].resetTime - now) / 1000)),
  };
}

/**
 * Rate limiter simplu bazat pe memorie
 * Pentru production, folosește Redis sau similar
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Verifică dacă există intrare
  if (!store[key] || store[key].resetTime < now) {
    // Crează intrare nouă
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key].resetTime,
    };
  }

  // Incrementează counter
  store[key].count++;

  // Verifică limita
  if (store[key].count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store[key].resetTime,
      retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - store[key].count,
    resetTime: store[key].resetTime,
  };
}

/**
 * Preset-uri comune pentru rate limiting
 */
const e2eUnlimited = (): RateLimitResult => ({
  allowed: true,
  remaining: 999,
  resetTime: Date.now() + 60_000,
});

export const rateLimitPresets = {
  /**
   * Login: două straturi — evită blocarea tuturor conturilor din același IP (NAT / Cloudflare / birou).
   * 1) Plafon per IP (volum)
   * 2) Plafon per IP + email (bruteforce pe un cont)
   */
  login: (ip: string, emailHint = "") => {
    if (isE2eRateLimitBypassEnabled()) return e2eUnlimited();

    const suffix =
      typeof emailHint === "string"
        ? emailHint.trim().toLowerCase().slice(0, 254)
        : "";
    const credKey = `${ip}:${suffix || "_anonymous"}`;

    const ipVolume = rateLimit(`login:ip_vol:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 120,
    });
    if (!ipVolume.allowed) return ipVolume;

    return rateLimit(`login:cred:${credKey}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 30,
    });
  },

  // Register: 3 înregistrări per oră
  register: (ip: string) =>
    isE2eRateLimitBypassEnabled()
      ? e2eUnlimited()
      : rateLimit(`register:${ip}`, {
          windowMs: 60 * 60 * 1000,
          maxRequests: 3,
        }),

  // Create listing (legacy key): aligned with listing_publish 100 / 24h
  createListing: (userId: string) =>
    rateLimit(`listing:publish:${userId}`, {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 100,
    }),

  // Report: 5 per oră per user
  createReport: (userId: string) =>
    rateLimit(`report:create:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    }),

  // API general: 100 request-uri per minut per IP
  api: (ip: string) =>
    rateLimit(`api:${ip}`, {
      windowMs: 60 * 1000,
      maxRequests: 100,
    }),

  // Upload imagini: per user (see UPLOAD_RATE_LIMIT_AUTH_PER_HOUR)
  uploadImage: (userId: string) =>
    rateLimit(`image:upload:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: UPLOAD_RATE_LIMIT_AUTH_PER_HOUR,
    }),

  // Moderare (pentru moderatori): 200 per oră
  moderation: (userId: string) =>
    rateLimit(`moderation:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 200,
    }),

  /** Mesaje: per user (normal); fallback IP doar dacă tokenul nu e decodabil în middleware */
  messages: (identifier: string, scope: 'ip' | 'user' = 'ip') =>
    rateLimit(`messages:${scope}:${identifier}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: scope === 'user' ? 250 : 500,
    }),

  // Rapoarte: 5 per oră per IP
  reports: (ip: string) =>
    rateLimit(`reports:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    }),

  // Incărcare fișiere: per IP fallback (see UPLOAD_RATE_LIMIT_IP_PER_HOUR)
  upload: (ip: string) =>
    rateLimit(`upload:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: UPLOAD_RATE_LIMIT_IP_PER_HOUR,
    }),

  // Contact/Formular: 5 per oră per IP
  contact: (ip: string) =>
    rateLimit(`contact:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    }),

  // Promovare listing: 20 per oră per IP
  promote: (ip: string) =>
    rateLimit(`promote:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 20,
    }),

  // Acțiuni de moderare: 100 per oră per IP
  moderateAction: (ip: string) =>
    rateLimit(`moderate:action:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    }),

  // Payment actions: 20 per oră per IP
  payment: (ip: string) =>
    rateLimit(`payment:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 20,
    }),
};

/**
 * Obține IP din request
 */
export function getClientIp(request: Request): string {
  // Verifică headere de proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (nu funcționează în serverless)
  return 'unknown';
}

/**
 * Reset manual rate limit (pentru debugging)
 */
export function resetRateLimit(identifier: string): void {
  delete store[identifier];
}
