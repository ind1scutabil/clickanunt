/**
 * PHASE 2: Bot Protection with Cloudflare Turnstile
 * Prevents automated abuse and scraping
 */

export interface TurnstileVerifyRequest {
  token: string;
  remoteip?: string;
}

export interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  error_codes?: string[];
  score_reason?: string[];
}

/**
 * Verify Turnstile token on server-side
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  const devBypass = process.env.TURNSTILE_DEV_BYPASS === 'true';
  if (!isProd && devBypass && token === 'dev-bypass') {
    return { success: true };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('TURNSTILE_SECRET_KEY not configured');
    return { success: false, error_codes: ['MISSING_SECRET_KEY'] };
  }

  if (!token) {
    return { success: false, error_codes: ['MISSING_TOKEN'] };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: remoteIp,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error_codes: [`HTTP_${response.status}`],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      error_codes: ['VERIFICATION_FAILED'],
    };
  }
}

/**
 * Bot detection patterns for anti-scraping
 */
interface SuspiciousPattern {
  pattern: RegExp;
  score: number;
  description: string;
}

const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  {
    pattern: /curl|wget|python|scrapy|beautifulsoup|selenium|headless/i,
    score: 50,
    description: 'Automation tool user agent',
  },
  {
    pattern: /bot|crawler|spider|scraper|search engine/i,
    score: 60,
    description: 'Bot-like user agent',
  },
  {
    pattern: /^[\s]*$/,
    score: 40,
    description: 'Missing or empty user agent',
  },
];

/**
 * Analyze request for bot-like behavior
 */
export function detectBotBehavior(userAgent: string | null, ipAddress: string): {
  isBot: boolean;
  confidence: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  if (!userAgent) {
    score += 20;
    reasons.push('Missing user agent');
  } else {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.pattern.test(userAgent)) {
        score += pattern.score;
        reasons.push(pattern.description);
      }
    }
  }

  // Check for rapid-fire requests from same IP (would be tracked separately)
  // This is a simplified check - in production use Redis

  return {
    isBot: score >= 50,
    confidence: Math.min(score, 100),
    reasons,
  };
}

/**
 * Anti-scraping check: Rate limiting based on request patterns
 */
const scrapingDetectionStore: Map<string, { count: number; lastReset: number }> = new Map();

export function checkScrapingPattern(ip: string): {
  isSuspicious: boolean;
  requestsPerMinute: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  let entry = scrapingDetectionStore.get(ip);

  if (!entry || now - entry.lastReset > windowMs) {
    entry = { count: 1, lastReset: now };
    scrapingDetectionStore.set(ip, entry);
    return { isSuspicious: false, requestsPerMinute: 1 };
  }

  entry.count++;
  const requestsPerMinute = entry.count;

  // Threshold: >100 requests per minute = likely scraper
  return {
    isSuspicious: requestsPerMinute > 100,
    requestsPerMinute,
  };
}

/**
 * Request validation middleware
 */
export function isRequestSuspicious(userAgent: string | null, ip: string): boolean {
  const botDetection = detectBotBehavior(userAgent, ip);
  const scrapingCheck = checkScrapingPattern(ip);

  return botDetection.isBot || scrapingCheck.isSuspicious;
}
