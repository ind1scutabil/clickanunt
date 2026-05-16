/**
 * Structured API route error logging — no passwords, tokens, or PII in metadata.
 */

import { logger } from '@/lib/observability';

export type ApiRouteErrorContext = {
  route: string;
  method?: string;
  requestId?: string | null;
  statusCode?: number;
  userId?: string | null;
  /** Safe labels only, e.g. rate_limit, validation, db */
  code?: string;
};

export function logApiRouteError(
  message: string,
  error: unknown,
  context: ApiRouteErrorContext
): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error(message, {
    metadata: {
      route: context.route,
      method: context.method ?? 'unknown',
      requestId: context.requestId ?? undefined,
      statusCode: context.statusCode,
      userIdSuffix: context.userId ? context.userId.slice(0, 8) : undefined,
      code: context.code,
      error: err,
    },
  });
}

export function requestIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-request-id');
}
