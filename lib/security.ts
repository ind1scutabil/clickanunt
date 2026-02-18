/**
 * Security System - Maximum Protection
 * Protecție împotriva DDoS, brute force, injection attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// IP Blacklist - permanent banned IPs
const blacklistedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; firstSeen: number }>();
const rateLimitStore = new Map<string, { requests: number[]; blocked: boolean; blockedUntil?: number }>();

// Security thresholds
const SECURITY_CONFIG = {
  // DDoS Protection
  MAX_REQUESTS_PER_SECOND: 10,
  MAX_REQUESTS_PER_MINUTE: 100,
  MAX_REQUESTS_PER_HOUR: 1000,
  
  // Brute Force Protection
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_BAN_DURATION: 30 * 60 * 1000, // 30 minutes
  
  // Suspicious Activity Detection
  SUSPICIOUS_THRESHOLD: 50, // requests in 10 seconds
  AUTO_BAN_THRESHOLD: 100, // requests in 10 seconds
  
  // Rate limit window
  RATE_WINDOW: 60 * 1000, // 1 minute
  
  // Block duration for suspicious IPs
  TEMP_BLOCK_DURATION: 15 * 60 * 1000, // 15 minutes
};

/**
 * Extract IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  return cfIP || realIP || forwarded?.split(',')[0] || 'unknown';
}

/**
 * Check if IP is blacklisted
 */
export function isBlacklisted(ip: string): boolean {
  return blacklistedIPs.has(ip);
}

/**
 * Add IP to blacklist
 */
export function blacklistIP(ip: string): void {
  blacklistedIPs.add(ip);
  console.error(`🚨 SECURITY ALERT: IP ${ip} has been BLACKLISTED`);
}

/**
 * Rate limiting with DDoS protection
 */
export function checkRateLimit(ip: string): { allowed: boolean; reason?: string; retryAfter?: number } {
  const now = Date.now();
  
  // Check if IP is temporarily blocked
  const record = rateLimitStore.get(ip);
  if (record?.blocked && record.blockedUntil) {
    if (now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return { 
        allowed: false, 
        reason: 'Temporarily blocked due to suspicious activity',
        retryAfter 
      };
    } else {
      // Unblock
      record.blocked = false;
      record.blockedUntil = undefined;
      record.requests = [];
    }
  }
  
  // Get or create rate limit record
  const requests = record?.requests || [];
  
  // Remove old requests (older than rate window)
  const recentRequests = requests.filter(time => now - time < SECURITY_CONFIG.RATE_WINDOW);
  
  // Check for DDoS patterns
  const veryRecentRequests = recentRequests.filter(time => now - time < 10000); // Last 10 seconds
  
  if (veryRecentRequests.length > SECURITY_CONFIG.AUTO_BAN_THRESHOLD) {
    // Auto-ban for extreme DDoS
    blacklistIP(ip);
    return { allowed: false, reason: 'Banned for DDoS attack' };
  }
  
  if (veryRecentRequests.length > SECURITY_CONFIG.SUSPICIOUS_THRESHOLD) {
    // Temporary block for suspicious activity
    rateLimitStore.set(ip, {
      requests: recentRequests,
      blocked: true,
      blockedUntil: now + SECURITY_CONFIG.TEMP_BLOCK_DURATION
    });
    console.warn(`⚠️ SECURITY: IP ${ip} temporarily blocked for suspicious activity`);
    return { 
      allowed: false, 
      reason: 'Too many requests - temporarily blocked',
      retryAfter: Math.ceil(SECURITY_CONFIG.TEMP_BLOCK_DURATION / 1000)
    };
  }
  
  // Check rate limit
  if (recentRequests.length >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.ceil((SECURITY_CONFIG.RATE_WINDOW - (now - recentRequests[0])) / 1000);
    return { 
      allowed: false, 
      reason: 'Rate limit exceeded',
      retryAfter 
    };
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(ip, { requests: recentRequests, blocked: false });
  
  return { allowed: true };
}

/**
 * Detect SQL Injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE)\b)/gi,
    /(--|\*\/|\/\*|\bOR\b.*=.*|;.*DROP|;.*DELETE)/gi,
    /(\bAND\b.*\bOR\b|\bOR\b.*\bAND\b)/gi,
    /(\'|\").*(\bOR\b|\bAND\b).*(\=|LIKE)/gi,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect XSS attempts
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
    /<img[\s\S]*?onerror\s*=/gi,
    /<svg[\s\S]*?onload\s*=/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect Path Traversal attempts
 */
export function detectPathTraversal(input: string): boolean {
  const pathPatterns = [
    /\.\.[\/\\]/g, // ../
    /\.\.[\\\/]/g, // ..\
    /%2e%2e[\/\\]/gi, // URL encoded ../
    /\.\.\%2f/gi,
  ];
  
  return pathPatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive input validation
 */
export function validateInput(input: any): { valid: boolean; reason?: string } {
  if (typeof input === 'string') {
    if (detectSQLInjection(input)) {
      return { valid: false, reason: 'SQL injection detected' };
    }
    if (detectXSS(input)) {
      return { valid: false, reason: 'XSS attempt detected' };
    }
    if (detectPathTraversal(input)) {
      return { valid: false, reason: 'Path traversal detected' };
    }
  }
  
  if (typeof input === 'object' && input !== null) {
    for (const value of Object.values(input)) {
      const result = validateInput(value);
      if (!result.valid) return result;
    }
  }
  
  return { valid: true };
}

/**
 * Security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    
    // HSTS
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Prevent MIME sniffing
    'X-Download-Options': 'noopen',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy - allow payment for Stripe
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
    
    // Remove server info
    'X-Powered-By': '',
  };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const timestamp = Date.now().toString();
  const hash = createHash('sha256')
    .update(`${sessionId}${timestamp}${process.env.JWT_SECRET}`)
    .digest('hex');
  return `${timestamp}.${hash}`;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, sessionId: string): boolean {
  try {
    const [timestamp, hash] = token.split('.');
    const age = Date.now() - parseInt(timestamp);
    
    // Token expires after 1 hour
    if (age > 60 * 60 * 1000) return false;
    
    const expectedHash = createHash('sha256')
      .update(`${sessionId}${timestamp}${process.env.JWT_SECRET}`)
      .digest('hex');
    
    return hash === expectedHash;
  } catch {
    return false;
  }
}

/**
 * Log security event
 */
export function logSecurityEvent(event: {
  type: string;
  ip: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  const timestamp = new Date().toISOString();
  console.error(`🔒 SECURITY [${event.severity.toUpperCase()}] [${timestamp}]`, {
    type: event.type,
    ip: event.ip,
    details: event.details,
  });
  
  // In production, send to monitoring service (e.g., Sentry, DataDog)
  if (process.env.NODE_ENV === 'production' && event.severity === 'critical') {
    // TODO: Send alert to admin
  }
}

/**
 * Clean old rate limit records (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  const cleanupInterval = 10 * 60 * 1000; // 10 minutes
  
  for (const [ip, record] of rateLimitStore.entries()) {
    const oldestRequest = record.requests[0];
    if (oldestRequest && now - oldestRequest > cleanupInterval) {
      rateLimitStore.delete(ip);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

export const securityConfig = SECURITY_CONFIG;
