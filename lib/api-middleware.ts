/**
 * API Middleware for Production Readiness
 * 
 * Integrates all security, monitoring, and optimization features
 * 
 * Usage in API routes:
 * 
 * import { withMiddleware } from '@/lib/api-middleware';
 * 
 * export async function GET(request: NextRequest) {
 *   return withMiddleware(request, async () => {
 *     // Your handler code
 *   });
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './metrics';
import { distributedTracer } from './distributed-tracing';
import { wafEngine } from './waf';
import { distributedRateLimiter, RATE_LIMIT_CONFIGS } from './distributed-rate-limit';
import { bruteForceDetector } from './brute-force';
import { getCacheConfigForPath, buildCacheControlHeader } from './cdn';

export async function withMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: {
    rateLimit?: keyof typeof RATE_LIMIT_CONFIGS;
    requireAuth?: boolean;
    wafEnabled?: boolean;
  } = {}
) {
  const startTime = Date.now();
  const method = request.method;
  const path = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Start distributed trace
  const traceId = distributedTracer.startTrace({
    method,
    path,
    ip,
  });

  try {
    // 1. WAF Check
    if (options.wafEnabled !== false) {
      const wafMatches = wafEngine.check(
        `${method} ${path}`,
        { ip }
      );

      if (wafMatches.length > 0) {
        const action = wafEngine.getAction(wafMatches);
        if (action === 'block') {
          distributedTracer.endTrace(traceId);
          return NextResponse.json(
            { error: 'Request blocked by WAF' },
            { status: 403 }
          );
        }
      }
    }

    // 2. Rate Limiting Check
    if (options.rateLimit) {
      const config = RATE_LIMIT_CONFIGS[options.rateLimit];
      const rateLimitKey = `${ip}:${path}`;

      const result = await distributedRateLimiter.check(
        rateLimitKey,
        config.maxRequests,
        config.windowMs
      );

      if (!result.allowed) {
        distributedTracer.endTrace(traceId);
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.retryAfter || 60),
            },
          }
        );
      }
    }

    // 3. Handler execution with tracing
    const handlerSpanId = distributedTracer.startSpan(traceId, 'handler', undefined, {
      method,
      path,
    });

    let response: NextResponse;

    try {
      response = await handler();
    } catch (error) {
      distributedTracer.recordError(handlerSpanId, error as Error);

      // Return 500 error
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Record metrics
    metricsCollector.recordRequest(duration, response.status);

    // Set cache headers
    const cacheConfig = getCacheConfigForPath(path);
    response.headers.set('Cache-Control', buildCacheControlHeader(cacheConfig));

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Add trace ID to response
    response.headers.set('X-Trace-ID', traceId);

    // End tracing
    distributedTracer.endSpan(handlerSpanId, response.status < 400 ? 'success' : 'error');
    distributedTracer.endTrace(traceId);

    // Log slow requests
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${method} ${path} took ${duration}ms`, {
        status: response.status,
        traceId,
      });
    }

    return response;
  } catch (error) {
    distributedTracer.endTrace(traceId);
    throw error;
  }
}

/**
 * Middleware for authentication endpoints (with brute force protection)
 */
export async function withAuthMiddleware(
  request: NextRequest,
  handler: (userId: string) => Promise<NextResponse>,
  userId: string
) {
  // Check brute force status
  const bruteForceStatus = bruteForceDetector.getStatus(userId);

  if (bruteForceStatus.locked) {
    return NextResponse.json(
      {
        error: 'Account temporarily locked due to too many failed attempts',
        lockoutUntil: bruteForceStatus.lockoutUntil,
      },
      { status: 429 }
    );
  }

  return withMiddleware(request, () => handler(userId), {
    rateLimit: 'LOGIN',
  });
}

/**
 * Middleware for health checks (bypasses rate limiting, WAF, auth)
 */
export async function withHealthCheckMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  return withMiddleware(request, handler, {
    rateLimit: undefined,
    wafEnabled: false,
    requireAuth: false,
  });
}
