/**
 * SECURITY MIDDLEWARE - Unified
 * Combines: CSRF validation, input validation, rate limiting
 * 
 * Usage in endpoints:
 * const validation = await validateRequest(req, loginSchema);
 * if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateCSRFToken } from '@/lib/security/csrf';
import { rateLimitPresets, getClientIp, RateLimitResult } from '@/lib/rateLimit';
import { peekSecureRateLimit } from '@/lib/rate-limit-distributed';
import {
  resolveSecureRateLimit,
  type SecureRateLimitPreset,
} from '@/lib/rate-limit-distributed';
import { logApiRouteError } from '@/lib/observability/api-route-error';
import { recordRequestDurationMs } from '@/lib/infra/request-metrics';
import { parseAndValidate } from '@/lib/security/validation-schemas';
import { logger } from '@/lib/observability';
import { verifyAccessToken } from '@/lib/security/tokens';
import crypto from 'crypto';
import { rateLimitPaymentRedis } from '@/lib/rateLimit-redis';
import { formatSecureRateLimitErrorRo } from '@/lib/listing-publish-rate-limit';

export interface SecurityValidationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  csrfError?: boolean;
  validationError?: boolean;
  rateLimitError?: boolean;
}

export interface ValidationOptions {
  requireCSRF?: boolean;
  rateLimit?:
    | 'login'
    | 'register'
    | 'listings'
    | 'listing_publish'
    | 'listing_draft'
    | 'listing_update'
    | 'messages'
    | 'reports'
    | 'upload'
    | 'contact'
    | 'api'
    | 'payment'
    | 'moderation'
    | null;
  schema?: z.ZodSchema;
}

/**
 * Comprehensive request validation with all security checks
 */
export async function validateSecureRequest(
  request: NextRequest,
  options: ValidationOptions = {}
): Promise<SecurityValidationResult> {
  const {
    requireCSRF = true,
    rateLimit = null,
    schema = null,
  } = options;

  const metricsStart =
    process.env.ENABLE_PRODUCTION_HEALTH_OPS === '1' ? performance.now() : null;

  try {
    // Get client IP for rate limiting and logging
    const clientIp = getClientIp(request);
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

    // Attempt to identify user from access token
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get('accessToken')?.value || null;
    const accessToken = bearer || cookieToken;
    const tokenPayload = accessToken ? verifyAccessToken(accessToken) : null;
    const userId = tokenPayload?.userId || null;
    const userRole = tokenPayload?.role ?? null;
    
    // ===== 1. CSRF VALIDATION (for state-changing operations) =====
    if (requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        await validateCSRFToken(request);
      } catch (error) {
        logger.warn('CSRF validation failed', {
          metadata: {
            method: request.method,
            path: request.nextUrl.pathname,
            ip: clientIp,
            requestId,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        return {
          success: false,
          error: 'CSRF token invalid or missing - request rejected',
          csrfError: true,
        };
      }
    }

    // ===== 2. PARSE AND VALIDATE INPUT =====
    let validatedData: unknown = {};
    if (schema) {
      const parseResult = await parseAndValidate(request.clone(), schema);
      if (!parseResult.success) {
        logger.debug('Input validation failed', {
          metadata: {
            path: request.nextUrl.pathname,
            requestId,
            error: parseResult.error,
          },
        });

        return {
          success: false,
          error: parseResult.error || 'Invalid input',
          validationError: true,
        };
      }
      validatedData = parseResult.data || {};
    }

    // ===== 3. RATE LIMITING =====
    if (rateLimit) {
      let rateLimitResult: RateLimitResult;

      switch (rateLimit) {
        case 'login': {
          let loginHint = '';
          const vd =
            validatedData && typeof validatedData === 'object'
              ? (validatedData as Record<string, unknown>)
              : null;
          if (vd) {
            const em = vd.email;
            if (typeof em === 'string' && em.trim()) {
              loginHint = em;
            } else if (typeof vd.sessionToken === 'string' && vd.sessionToken) {
              loginHint =
                '2fa:' +
                crypto
                  .createHash('sha256')
                  .update(vd.sessionToken)
                  .digest('hex')
                  .slice(0, 24);
            }
          }
          rateLimitResult = await resolveSecureRateLimit(
            'login',
            clientIp,
            userId,
            loginHint
          );
          break;
        }
        case 'listing_publish':
        case 'listings':
          rateLimitResult = await peekSecureRateLimit(
            rateLimit as SecureRateLimitPreset,
            clientIp,
            userId,
            '',
            userRole
          );
          break;
        case 'register':
        case 'listing_draft':
        case 'listing_update':
        case 'messages':
        case 'reports':
        case 'upload':
        case 'contact':
        case 'api':
        case 'moderation':
          rateLimitResult = await resolveSecureRateLimit(
            rateLimit as SecureRateLimitPreset,
            clientIp,
            userId,
            '',
            userRole
          );
          break;
        case 'payment':
          try {
            rateLimitResult = await rateLimitPaymentRedis(clientIp);
          } catch (e) {
            // Keep checkout available even if Redis is temporarily unavailable.
            logger.warn('Redis rate limiting unavailable; falling back to in-memory limits', {
              ip: clientIp,
              error: e instanceof Error ? e.message : String(e),
              environment: process.env.NODE_ENV,
            });
            rateLimitResult = rateLimitPresets.payment(clientIp);
          }
          break;
        case 'moderation':
          rateLimitResult = userId
            ? rateLimitPresets.moderation(userId)
            : rateLimitPresets.api(clientIp);
          break;
        default:
          rateLimitResult = { allowed: true, remaining: 0, resetTime: 0 };
      }

      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded', {
          metadata: {
            ip: clientIp,
            type: rateLimit,
            retryAfter: rateLimitResult.retryAfter,
            path: request.nextUrl.pathname,
            requestId,
          },
        });

        return {
          success: false,
          error: formatSecureRateLimitErrorRo(
            rateLimit,
            rateLimitResult.retryAfter ?? 60
          ),
          rateLimitError: true,
        };
      }
    }

    // ===== ALL CHECKS PASSED =====
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    logApiRouteError('Security validation error', error, {
      route: request.nextUrl.pathname,
      method: request.method,
      requestId: request.headers.get('x-request-id'),
      code: 'security_validation',
    });

    return {
      success: false,
      error: 'Internal validation error',
    };
  } finally {
    if (metricsStart != null) {
      recordRequestDurationMs(performance.now() - metricsStart);
    }
  }
}

/**
 * Helper: Return standardized error response
 */
export function securityErrorResponse(validation: SecurityValidationResult) {
  const statusCode = validation.rateLimitError ? 429 : 400;
  return NextResponse.json(
    {
      error: validation.error,
      ...(process.env.NODE_ENV !== 'production' && { details: validation }),
    },
    { status: statusCode }
  );
}

/**
 * Predefined validator factories for common endpoints
 */

export const validators = {
  // Login endpoint validator
  login: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'login',
      schema,
    }),

  // Register endpoint validator
  register: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'register',
      schema,
    }),

  // Create listing validator
  createListing: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'listing_publish',
      schema,
    }),

  // Edit listing validator
  editListing: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: null,
      schema,
    }),

  // Delete listing validator
  deleteListing: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: null,
      schema,
    }),

  // Send message validator
  sendMessage: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'messages',
      schema,
    }),

  // Create report validator
  createReport: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'reports',
      schema,
    }),

  // Admin action validator
  adminAction: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: null,
      schema,
    }),

  // File upload validator
  upload: async (request: NextRequest, schema?: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'upload',
      schema,
    }),

  // Contact form validator
  contact: async (request: NextRequest, schema: z.ZodSchema) =>
    validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'contact',
      schema,
    }),
};
