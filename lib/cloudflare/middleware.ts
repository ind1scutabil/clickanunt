/**
 * Cloudflare Middleware Integration
 * 
 * Features:
 * - Real IP extraction
 * - CF Ray tracing
 * - Admin protection
 * - Rate limit headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareRequestInfo } from './config';
import { verifyAdminAccess } from './admin-protection';
import { auditLogger, AUDIT_ACTIONS } from './audit-logging';
import { createLogContext, logger } from './observability';

/**
 * Cloudflare request context
 */
export interface CFRequestContext {
  realIP: string;
  country: string;
  rayID: string;
  isCloudflareBot: boolean;
  isCloudflare: boolean;
  threatScore: number;
  botScore?: number;
}

/**
 * Extract Cloudflare context from request
 */
export function extractCFContext(request: NextRequest): CFRequestContext {
  const cfInfo = getCloudflareRequestInfo(request.headers);
  const threatScore = parseInt(request.headers.get('cf-threat-score') || '0', 10);
  const botScore = request.headers.get('cf-bot-management-score')
    ? parseInt(request.headers.get('cf-bot-management-score')!, 10)
    : undefined;

  return {
    realIP: cfInfo.realIP,
    country: cfInfo.country,
    rayID: cfInfo.rayID,
    isCloudflareBot: cfInfo.isCloudflareBot,
    isCloudflare: cfInfo.isCloudflare,
    threatScore,
    botScore,
  };
}

/**
 * Middleware for Cloudflare integration
 */
export async function withCloudflareMiddleware(
  request: NextRequest,
  handler: (cfContext: CFRequestContext) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const cfContext = extractCFContext(request);
  const logContext = createLogContext(request.headers);

  // Set logger context
  logger.setCorrelationId(logContext.correlationId);
  logger.setRayID(cfContext.rayID);

  // Log incoming request
  logger.info('Incoming request', {
    path: request.nextUrl.pathname,
    method: request.method,
    ip: cfContext.realIP,
    country: cfContext.country,
  });

  try {
    // Check admin protection for /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const adminAuth = await verifyAdminAccess({
        ip: cfContext.realIP,
        country: cfContext.country,
        userId: 'system', // Should be extracted from JWT
        email: 'system@clickanunt.ro',
        rayID: cfContext.rayID,
        timestamp: Date.now(),
      });

      if (!adminAuth.allowed) {
        // Log security event
        auditLogger.logEvent({
          timestamp: Date.now(),
          userId: 'system',
          email: 'system@clickanunt.ro',
          action: AUDIT_ACTIONS.ADMIN_LOGIN,
          resource: 'admin_panel',
          ip: cfContext.realIP,
          country: cfContext.country,
          result: 'failure',
          errorMessage: 'IP not in allowlist',
          rayID: cfContext.rayID,
        });

        logger.logSecurityEvent('Unauthorized admin access attempt', 'critical', {
          ip: cfContext.realIP,
          country: cfContext.country,
          reason: 'IP not in allowlist',
        });

        return new NextResponse('Unauthorized', {
          status: 403,
          headers: {
            'CF-Ray': cfContext.rayID,
          },
        });
      }

      // If 2FA required, add header
      if (adminAuth.requiresTwoFactor) {
        const response = NextResponse.json({
          message: 'Two-factor authentication required',
          riskScore: adminAuth.riskScore,
        });
        response.headers.set('X-2FA-Required', 'true');
        response.headers.set('X-Risk-Score', adminAuth.riskScore.toString());
        return response;
      }
    }

    // Call handler
    const response = await handler(cfContext);

    // Add CF headers to response
    response.headers.set('CF-Ray', cfContext.rayID);
    response.headers.set('X-Real-IP', cfContext.realIP);
    response.headers.set('X-Country', cfContext.country);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Log response
    const statusCode = response.status;
    logger.logRequest(
      request.method,
      request.nextUrl.pathname,
      statusCode,
      Date.now() - logContext.startTime,
      {
        ip: cfContext.realIP,
        country: cfContext.country,
        rayID: cfContext.rayID,
      }
    );

    return response;
  } catch (error) {
    logger.error('Middleware error', {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
      ip: cfContext.realIP,
    });

    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: {
        'CF-Ray': cfContext.rayID,
      },
    });
  }
}

/**
 * Trusted proxy configuration for real IP detection
 */
export const TRUSTED_PROXIES = [
  'cf', // Cloudflare
  process.env.TRUSTED_PROXY || '', // Additional trusted proxy if configured
].filter(Boolean);

/**
 * Check if IP should be trusted
 */
export function isTrustedProxy(proxyIdentifier: string): boolean {
  return TRUSTED_PROXIES.includes(proxyIdentifier);
}

/**
 * Rate limit headers from Cloudflare
 */
export function getRateLimitHeaders(response: NextResponse): {
  limit?: string;
  remaining?: string;
  reset?: string;
  retryAfter?: string;
} {
  return {
    limit: response.headers.get('RateLimit-Limit') || undefined,
    remaining: response.headers.get('RateLimit-Remaining') || undefined,
    reset: response.headers.get('RateLimit-Reset') || undefined,
    retryAfter: response.headers.get('Retry-After') || undefined,
  };
}
