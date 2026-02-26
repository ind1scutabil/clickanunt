import { NextRequest, NextResponse } from 'next/server';

import { getFlag } from '@/lib/feature-flags';
import { logger } from '@/lib/observability';
import { RATE_LIMITS, withRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type TelemetryEvent = {
  name?: string;
  level?: 'info' | 'warn' | 'error';
  timestamp?: string;
  payload?: Record<string, unknown>;
  breadcrumbs?: Array<{ message: string; category?: string; at?: string }>;
};

const handler = async (req: NextRequest): Promise<NextResponse> => {
  if (!getFlag('enterprise_observability') && !getFlag('enterprise_event_tracking')) {
    return NextResponse.json({ accepted: false, reason: 'feature_disabled' }, { status: 202 });
  }

  let body: TelemetryEvent = {};
  try {
    body = (await req.json()) as TelemetryEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const requestId = req.headers.get('x-request-id') || undefined;
  const eventName = String(body.name || 'unknown_event');
  const level = body.level || 'info';

  logger.setContext({
    requestId,
    action: `mobile_event:${eventName}`,
    metadata: {
      source: 'mobile',
      timestamp: body.timestamp || new Date().toISOString(),
      payload: body.payload || {},
      breadcrumbs: body.breadcrumbs || [],
    },
  });

  if (level === 'error') {
    logger.error(`Mobile event ${eventName}`, body.payload);
  } else if (level === 'warn') {
    logger.warn(`Mobile event ${eventName}`, body.payload);
  } else {
    logger.info(`Mobile event ${eventName}`, body.payload);
  }

  logger.clearContext();

  return NextResponse.json({ accepted: true }, { status: 202 });
};

export const POST = withRateLimit(handler, RATE_LIMITS.API);
