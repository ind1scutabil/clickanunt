/**
 * Request ID middleware for tracing
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || uuidv4();
}

export function setRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
}

/**
 * Performance tracker for routes
 */
export class PerformanceTracker {
  private startTime: number;
  private requestId: string;
  private operation: string;

  constructor(requestId: string, operation: string) {
    this.startTime = Date.now();
    this.requestId = requestId;
    this.operation = operation;
  }

  end(metadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    return duration;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}
