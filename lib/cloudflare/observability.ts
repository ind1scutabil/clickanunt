/**
 * Observability - Logs, Metrics, CF-Ray Integration
 * 
 * Features:
 * - Structured logging (JSON)
 * - Correlation IDs
 * - CloudFlare Ray tracing
 * - Real IP logging
 * - Performance metrics
 */

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  correlationId: string;
  rayID?: string;
  userId?: string;
  ip?: string;
  country?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number; // milliseconds
  metadata?: Record<string, unknown>;
}

export interface ObservabilityConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCloudflare: boolean;
  enableSentry: boolean;
  retentionDays: number;
}

type LogOptions = {
  service?: string;
  userId?: string;
  ip?: string;
  country?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Observability config
 */
export const OBSERVABILITY_CONFIG: ObservabilityConfig = {
  logLevel: ((): ObservabilityConfig['logLevel'] => {
    const envLogLevel = process.env.LOG_LEVEL as ObservabilityConfig['logLevel'] | undefined;
    const allowed: ObservabilityConfig['logLevel'][] = ['debug', 'info', 'warn', 'error'];
    return envLogLevel && allowed.includes(envLogLevel) ? envLogLevel : 'info';
  })(),
  enableCloudflare: process.env.ENABLE_CF_LOGGING === 'true',
  enableSentry: !!process.env.SENTRY_DSN,
  retentionDays: 30,
};

/**
 * Logger with CF integration
 */
class Logger {
  private correlationId: string = '';
  private rayID: string = '';

  /**
   * Set correlation ID for tracing
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Set CF Ray ID
   */
  setRayID(id: string): void {
    this.rayID = id;
  }

  /**
   * Log entry
   */
  private logEntry(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    options: LogOptions = {}
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      service: options.service || 'app',
      correlationId: this.correlationId,
      rayID: this.rayID,
      userId: options.userId,
      ip: options.ip,
      country: options.country,
      path: options.path,
      method: options.method,
      statusCode: options.statusCode,
      duration: options.duration,
      metadata: options.metadata,
    };

    // Output as JSON for structured logging
    console.log(JSON.stringify(entry));

    // Send to Sentry for errors
    if (level === 'error' && OBSERVABILITY_CONFIG.enableSentry) {
      this.sendToSentry(entry);
    }
  }

  debug(message: string, options?: LogOptions): void {
    if (OBSERVABILITY_CONFIG.logLevel === 'debug') {
      this.logEntry('debug', message, options);
    }
  }

  info(message: string, options?: LogOptions): void {
    if (['debug', 'info'].includes(OBSERVABILITY_CONFIG.logLevel)) {
      this.logEntry('info', message, options);
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (['debug', 'info', 'warn'].includes(OBSERVABILITY_CONFIG.logLevel)) {
      this.logEntry('warn', message, options);
    }
  }

  error(message: string, options?: LogOptions): void {
    this.logEntry('error', message, options);
  }

  /**
   * Send to Sentry
   */
  private sendToSentry(entry: LogEntry): void {
    void entry;
    try {
      // TODO: Implement Sentry integration
      // Sentry.captureException(new Error(entry.message), {
      //   contexts: {
      //     app: {
      //       correlationId: entry.correlationId,
      //       rayID: entry.rayID,
      //     },
      //   },
      //   tags: {
      //     service: entry.service,
      //     country: entry.country,
      //   },
      // });
    } catch (e) {
      console.error('[OBSERVABILITY_ERROR]', e);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    options: {
      ip?: string;
      country?: string;
      userId?: string;
      rayID?: string;
    } = {}
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.logEntry(level, `${method} ${path}`, {
      service: 'http',
      path,
      method,
      statusCode,
      duration,
      ip: options.ip,
      country: options.country,
      userId: options.userId,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    options: {
      ip?: string;
      country?: string;
      userId?: string;
      reason?: string;
    } = {}
  ): void {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';

    this.logEntry(level, `Security: ${event}`, {
      service: 'security',
      ip: options.ip,
      country: options.country,
      userId: options.userId,
      metadata: {
        severity,
        reason: options.reason,
      },
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: 'query' | 'insert' | 'update' | 'delete',
    table: string,
    duration: number,
    options?: { userId?: string; rowsAffected?: number }
  ): void {
    this.logEntry('debug', `DB ${operation.toUpperCase()} ${table}`, {
      service: 'database',
      duration,
      metadata: {
        operation,
        table,
        rowsAffected: options?.rowsAffected,
      },
      userId: options?.userId,
    });
  }
}

/**
 * Export singleton
 */
export const logger = new Logger();

/**
 * Performance metrics
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record metric
   */
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * Get percentile
   */
  getPercentile(name: string, percentile: number): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get average
   */
  getAverage(name: string): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Export metrics
   */
  export(): Record<string, { p50: number | null; p95: number | null; p99: number | null; avg: number | null }> {
    const result: Record<string, { p50: number | null; p95: number | null; p99: number | null; avg: number | null }> = {};

    this.metrics.forEach((values, name) => {
      result[name] = {
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
        avg: this.getAverage(name),
      };
    });

    return result;
  }

  /**
   * Clear old metrics (keep last hour)
   */
  cleanup(): void {
    this.metrics.forEach((values, name) => {
      if (values.length > 100000) {
        this.metrics.set(name, values.slice(-50000));
      }
    });
  }
}

/**
 * Export metrics singleton
 */
export const metrics = new PerformanceMetrics();

/**
 * CF Ray ID tracking
 */
export function extractCFRayID(headers: Headers): string {
  return headers.get('cf-ray') || 'unknown';
}

/**
 * Structured log context
 */
export interface LogContext {
  correlationId: string;
  rayID: string;
  ip: string;
  country: string;
  userId?: string;
  startTime: number;
}

/**
 * Create log context from request
 */
export function createLogContext(headers: Headers, userId?: string): LogContext {
  return {
    correlationId: headers.get('x-correlation-id') || generateCorrelationId(),
    rayID: extractCFRayID(headers),
    ip: headers.get('cf-connecting-ip') || headers.get('x-forwarded-for') || 'unknown',
    country: headers.get('cf-ipcountry') || 'unknown',
    userId,
    startTime: Date.now(),
  };
}

/**
 * Generate correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
