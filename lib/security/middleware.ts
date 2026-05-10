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
import { parseAndValidate } from '@/lib/security/validation-schemas';
import { logger } from '@/lib/observability';
import { verifyAccessToken } from '@/lib/security/tokens';
import crypto from 'crypto';
import { rateLimitPaymentRedis } from '@/lib/rateLimit-redis';

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
  rateLimit?: 'login' | 'register' | 'listings' | 'messages' | 'reports' | 'upload' | 'contact' | 'api' | 'payment' | 'moderation' | null;
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
          let loginHint = "";
          const vd =
            validatedData && typeof validatedData === "object"
              ? (validatedData as Record<string, unknown>)
              : null;
          if (vd) {
            const em = vd.email;
            if (typeof em === "string" && em.trim()) {
              loginHint = em;
            } else if (typeof vd.sessionToken === "string" && vd.sessionToken) {
              loginHint =
                "2fa:" +
                crypto
                  .createHash("sha256")
                  .update(vd.sessionToken)
                  .digest("hex")
                  .slice(0, 24);
            }
          }
          rateLimitResult = rateLimitPresets.login(clientIp, loginHint);
          break;
        }
        case 'register':
          rateLimitResult = rateLimitPresets.register(clientIp);
          break;
        case 'listings':
          rateLimitResult = userId
            ? rateLimitPresets.createListing(userId)
            : rateLimitPresets.api(clientIp);
          break;
        case 'messages':
          rateLimitResult = userId
            ? rateLimitPresets.messages(userId, 'user')
            : rateLimitPresets.messages(clientIp, 'ip');
          break;
        case 'reports':
          rateLimitResult = userId
            ? rateLimitPresets.createReport(userId)
            : rateLimitPresets.reports(clientIp);
          break;
        case 'upload':
          rateLimitResult = userId
            ? rateLimitPresets.uploadImage(userId)
            : rateLimitPresets.upload(clientIp);
          break;
        case 'contact':
          rateLimitResult = rateLimitPresets.contact(clientIp);
          break;
        case 'api':
          rateLimitResult = rateLimitPresets.api(clientIp);
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
          error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
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
    logger.error('Security validation error', {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        method: request.method,
      },
    });

    return {
      success: false,
      error: 'Internal validation error',
    };
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
      rateLimit: 'listings',
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
