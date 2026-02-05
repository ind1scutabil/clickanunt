/**
 * Observability System
 * Request tracking, structured logging, error tracking
 */

import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger
 */
class Logger {
  private context: LogContext = {};

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(data && { data }),
    };

    // JSON format pentru production (parsabil de log aggregators)
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable format pentru development
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[level];
      
      console.log(
        `${emoji} [${level.toUpperCase()}] ${message}`,
        this.context.requestId ? `[${this.context.requestId}]` : '',
        data || ''
      );
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
    });
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Middleware helper pentru request tracking
 */
export function withRequestTracking<T>(
  handler: (requestId: string) => Promise<T>
): Promise<T> {
  const requestId = generateRequestId();
  logger.setContext({ requestId });
  
  return handler(requestId).finally(() => {
    logger.clearContext();
  });
}

/**
 * Performance tracking
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    logger.info(`Performance: ${this.operation}`, { duration });
    return duration;
  }
}

/**
 * Error tracking wrapper
 */
export function captureException(error: Error, context?: LogContext): void {
  logger.setContext(context || {});
  logger.error('Exception captured', error);
  
  // TODO: Integrate with Sentry/Datadog/etc
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
}

/**
 * Metrics tracking (placeholder for future integration)
 */
export const metrics = {
  increment(metric: string, value = 1, tags?: Record<string, string>): void {
    logger.debug(`Metric: ${metric}`, { value, tags });
    // TODO: Integrate with Prometheus/StatsD/etc
  },

  gauge(metric: string, value: number, tags?: Record<string, string>): void {
    logger.debug(`Gauge: ${metric}`, { value, tags });
  },

  timing(metric: string, duration: number, tags?: Record<string, string>): void {
    logger.debug(`Timing: ${metric}`, { duration, tags });
  },
};
