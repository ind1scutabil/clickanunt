/**
 * Distributed Tracing with OpenTelemetry
 * 
 * Tracks requests across services with correlation IDs
 * Identifies slow operations and bottlenecks
 */

import { randomUUID } from 'crypto';

export interface Trace {
  id: string; // correlation ID
  spans: Span[];
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'pending';
  attributes: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

class DistributedTracer {
  private traces: Map<string, Trace> = new Map();
  private currentSpans: Map<string, Span> = new Map();

  /**
   * Start new trace
   */
  startTrace(metadata: Record<string, unknown> = {}): string {
    const traceId = randomUUID();
    const trace: Trace = {
      id: traceId,
      spans: [],
      startTime: Date.now(),
      metadata,
    };

    this.traces.set(traceId, trace);
    return traceId;
  }

  /**
   * Start span within trace
   */
  startSpan(
    traceId: string,
    name: string,
    parentSpanId?: string,
    attributes: Record<string, unknown> = {}
  ): string {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const spanId = randomUUID();
    const span: Span = {
      id: spanId,
      traceId,
      parentSpanId,
      name,
      operation: name,
      startTime: Date.now(),
      status: 'pending',
      attributes,
    };

    trace.spans.push(span);
    this.currentSpans.set(spanId, span);

    return spanId;
  }

  /**
   * End span
   */
  endSpan(spanId: string, status: 'success' | 'error' = 'success') {
    const span = this.currentSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.currentSpans.delete(spanId);

    // Alert if span took too long
    if (span.duration > 1000) {
      console.warn(
        `⚠️ Slow operation: ${span.name} took ${span.duration}ms`,
        {
          spanId,
          traceId: span.traceId,
          operation: span.operation,
        }
      );
    }
  }

  /**
   * Record error in span
   */
  recordError(spanId: string, error: Error) {
    const span = this.currentSpans.get(spanId);
    if (!span) return;

    span.status = 'error';
    span.error = {
      message: error.message,
      stack: error.stack,
    };
  }

  /**
   * Add attribute to span
   */
  addAttribute(spanId: string, key: string, value: unknown) {
    const span = this.currentSpans.get(spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  /**
   * End trace
   */
  endTrace(traceId: string) {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    // Log trace info
    if (trace.duration > 5000) {
      console.warn(`🔍 Slow trace: ${traceId}`, {
        duration: trace.duration,
        spanCount: trace.spans.length,
        slowSpans: trace.spans
          .filter(s => s.duration && s.duration > 1000)
          .map(s => ({ name: s.name, duration: s.duration })),
      });
    }
  }

  /**
   * Get trace details
   */
  getTrace(traceId: string): Trace | null {
    return this.traces.get(traceId) || null;
  }

  /**
   * Get trace tree (organized by parent-child relationships)
   */
  getTraceTree(traceId: string) {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    // Build tree structure
    const rootSpans = trace.spans.filter(s => !s.parentSpanId);

    const buildTree = (span: Span): Record<string, unknown> => ({
      ...span,
      children: trace.spans
        .filter(s => s.parentSpanId === span.id)
        .map(buildTree),
    });

    return {
      traceId: trace.id,
      duration: trace.duration,
      startTime: trace.startTime,
      spans: rootSpans.map(buildTree),
    };
  }

  /**
   * Export for APM systems
   */
  exportTrace(traceId: string) {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    return {
      traceID: trace.id,
      spans: trace.spans.map(span => ({
        traceID: span.traceId,
        spanID: span.id,
        operationName: span.operation,
        references: span.parentSpanId
          ? [{ refType: 'CHILD_OF', traceID: span.traceId, spanID: span.parentSpanId }]
          : [],
        startTime: span.startTime * 1000, // Convert to microseconds
        duration: (span.duration || 0) * 1000,
        tags: span.attributes,
      })),
    };
  }

  /**
   * Cleanup old traces
   */
  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < oneHourAgo) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const traces = Array.from(this.traces.values());
    const allSpans = traces.flatMap(t => t.spans);

    return {
      totalTraces: traces.length,
      totalSpans: allSpans.length,
      avgDuration: traces.reduce((sum, t) => sum + (t.duration || 0), 0) / traces.length,
      slowTraces: traces.filter(t => t.duration && t.duration > 5000).length,
      errorSpans: allSpans.filter(s => s.status === 'error').length,
    };
  }
}

export const distributedTracer = new DistributedTracer();

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    distributedTracer.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Middleware for automatic request tracing
 * 
 * Add to your API routes:
 * 
 * export async function GET(request: NextRequest) {
 *   const traceId = distributedTracer.startTrace({
 *     method: request.method,
 *     path: request.nextUrl.pathname,
 *     ip: request.ip,
 *   });
 *
 *   try {
 *     const spanId = distributedTracer.startSpan(traceId, 'database-query');
 *     // ... do work ...
 *     distributedTracer.endSpan(spanId, 'success');
 *     
 *     return response;
 *   } finally {
 *     distributedTracer.endTrace(traceId);
 *   }
 * }
 */
