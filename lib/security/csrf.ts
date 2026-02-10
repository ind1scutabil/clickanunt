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
  // Try header first (for AJAX requests)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }
  
  // Try cookie (double-submit pattern)
  const cookieToken = request.cookies.get('csrf-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  // Check Origin header
  if (origin) {
    return allowedOrigins.some(allowed => origin.startsWith(allowed));
  }
  
  // Fallback to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some(allowed => {
        const allowedUrl = new URL(allowed);
        return refererUrl.origin === allowedUrl.origin;
      });
    } catch {
      return false;
    }
  }
  
  // No origin/referer = suspicious
  return false;
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
 * CSRF middleware
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
  
  // For API routes with JSON, rely on SameSite cookies + Origin check
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // Additional check: ensure it's an AJAX request
    const requestedWith = request.headers.get('x-requested-with');
    if (requestedWith === 'XMLHttpRequest' || request.headers.get('x-csrf-token')) {
      return { valid: true };
    }
  }
  
  // For form submissions, require CSRF token
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
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };
}
