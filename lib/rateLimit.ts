/**
 * Rate Limiting pentru protecție bruteforce
 */

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

// Curăță automat la fiecare 5 minute
setInterval(cleanExpiredEntries, 5 * 60 * 1000);

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
  // Login: 5 încercări per 15 minute
  login: (ip: string) =>
    process.env.E2E_DISABLE_RATE_LIMIT === "1"
      ? e2eUnlimited()
      : rateLimit(`login:${ip}`, {
          windowMs: 15 * 60 * 1000,
          maxRequests: 5,
        }),

  // Register: 3 înregistrări per oră
  register: (ip: string) =>
    process.env.E2E_DISABLE_RATE_LIMIT === "1"
      ? e2eUnlimited()
      : rateLimit(`register:${ip}`, {
          windowMs: 60 * 60 * 1000,
          maxRequests: 3,
        }),

  // Create listing: 10 per oră per user
  createListing: (userId: string) =>
    rateLimit(`listing:create:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
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

  // Upload imagini: 20 per oră per user
  uploadImage: (userId: string) =>
    rateLimit(`image:upload:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 20,
    }),

  // Moderare (pentru moderatori): 200 per oră
  moderation: (userId: string) =>
    rateLimit(`moderation:${userId}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 200,
    }),

  // Mesaje: 10 per oră per IP / user
  messages: (identifier: string, scope: 'ip' | 'user' = 'ip') =>
    rateLimit(`messages:${scope}:${identifier}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    }),

  // Rapoarte: 5 per oră per IP
  reports: (ip: string) =>
    rateLimit(`reports:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    }),

  // Incărcare fișiere: 50 per oră per IP
  upload: (ip: string) =>
    rateLimit(`upload:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 50,
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
