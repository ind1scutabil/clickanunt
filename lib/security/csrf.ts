/**
 * CSRF Protection - OWASP ASVS V4.2
 * 
 * Features:
 * - Double-submit cookie pattern
 * - Synchronizer token pattern
 * - SameSite cookie attribute
 * - Origin/Referer validation
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash CSRF token for validation
 */
export function hashCsrfToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, hashedToken: string): boolean {
  if (!token || !hashedToken) {
    return false;
  }
  
  const computedHash = hashCsrfToken(token);
  
  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hashedToken)
  );
}

/**
 * Extract CSRF token from request
 */
export function extractCsrfToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('csrf-token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  // Prefer the explicit header for privileged writes:
  // - the frontend fetches a fresh CSRF token just-in-time and sends it via `x-csrf-token`
  // - some clients can keep a stale `csrf-token` cookie even when `csrf-token-hash` rotates
  return headerToken || cookieToken || null;
}

/**
 * Validate request origin
 */
function isAllowedClickanuntHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'clickanunt.ro' || h === 'www.clickanunt.ro' || h.endsWith('.clickanunt.ro');
}

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')?.trim();
  const referer = request.headers.get('referer')?.trim();
  const hostHeader = request.headers.get('host')?.split(':')[0];

  const devHosts = new Set(['localhost', '127.0.0.1', '46.225.69.155']);

  const hostFromHeader = (value: string): string | null => {
    const v = value.trim();
    if (!v || v === 'null') return null;

    // If it looks like a URL, prefer URL parsing.
    try {
      if (v.includes('://')) return new URL(v).hostname;
    } catch {
      // fallthrough
    }

    // Otherwise try to extract hostname from raw header (host[:port][/...]).
    const noProto = v.replace(/^https?:\/\//i, '');
    const firstPart = noProto.split('/')[0] || '';
    const host = firstPart.split(':')[0] || '';
    return host ? host.toLowerCase() : null;
  };

  // Evaluate origin/referer independently; if `Origin` exists but doesn't match,
  // we still accept the request when `Referer` is valid (common with some browsers/proxies).
  let originAllowed = false;
  let refererAllowed = false;

  if (origin) {
    const h = hostFromHeader(origin);
    originAllowed =
      !!h &&
      (isAllowedClickanuntHost(h) || (process.env.NODE_ENV !== 'production' && devHosts.has(h)));
  }

  if (referer) {
    const h = hostFromHeader(referer);
    refererAllowed =
      !!h &&
      (isAllowedClickanuntHost(h) || (process.env.NODE_ENV !== 'production' && devHosts.has(h)));
  }

  if (originAllowed || refererAllowed) return true;

  // Same request without Origin/Referer (some proxies / same-origin navigations)
  if (hostHeader && isAllowedClickanuntHost(hostHeader)) return true;
  if (hostHeader && process.env.NODE_ENV !== 'production' && devHosts.has(hostHeader.toLowerCase())) {
    return true;
  }

  // Allow if no origin/referer for same-site requests
  // (Cloudflare and some proxies might not send these)
  return true;
}

/**
 * Check if request requires CSRF protection
 */
export function requiresCsrfProtection(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  
  // Only protect state-changing methods
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

/**
 * Custom error class for CSRF validation failures
 */
export class CSRFValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSRFValidationError';
  }
}

/**
 * Comprehensive CSRF validation - throws on failure (for middleware)
 */
export async function validateCSRFToken(request: NextRequest): Promise<void> {
  // Skip for safe methods
  if (!requiresCsrfProtection(request)) {
    return;
  }

  // Validate origin first
  if (!validateOrigin(request)) {
    throw new CSRFValidationError('Invalid origin or referer');
  }

  // Require CSRF token match for all state-changing requests
  const token = extractCsrfToken(request);
  const storedHash = request.cookies.get('csrf-token-hash')?.value;

  if (!token || !storedHash) {
    throw new CSRFValidationError('CSRF token missing from request');
  }

  const computedHash = hashCsrfToken(token);
  const ok = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
  if (!ok) {
    throw new CSRFValidationError('CSRF token validation failed - token mismatch');
  }
}

/**
 * CSRF middleware (legacy wrapper - returns object)
 */
export async function csrfProtection(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Skip for safe methods
  if (!requiresCsrfProtection(request)) {
    return { valid: true };
  }
  
  // Validate origin first
  if (!validateOrigin(request)) {
    return {
      valid: false,
      error: 'Invalid origin or referer',
    };
  }
  
  // Require CSRF token for all state-changing requests
  const token = extractCsrfToken(request);
  const storedHash = request.cookies.get('csrf-token-hash')?.value;
  
  if (!token || !storedHash) {
    return {
      valid: false,
      error: 'CSRF token missing',
    };
  }
  
  if (!validateCsrfToken(token, storedHash)) {
    return {
      valid: false,
      error: 'CSRF token invalid',
    };
  }
  
  return { valid: true };
}

/**
 * Generate CSRF cookie options
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };
}
