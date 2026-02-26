import { MOBILE_CONFIG } from './config';
import { getFlag } from './featureFlags';

type EventLevel = 'info' | 'warn' | 'error';

type Breadcrumb = {
  message: string;
  category?: string;
  at: string;
};

const breadcrumbs: Breadcrumb[] = [];

const makeRequestId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${randomPart}`;
};

let requestId = makeRequestId();

export const getRequestId = (): string => requestId;

export const rotateRequestId = (): void => {
  requestId = makeRequestId();
};

export const addBreadcrumb = (message: string, category?: string): void => {
  if (!getFlag('enterprise_observability')) {
    return;
  }

  breadcrumbs.push({
    message,
    category,
    at: new Date().toISOString(),
  });

  if (breadcrumbs.length > 30) {
    breadcrumbs.shift();
  }
};

export const trackEvent = async (
  name: string,
  payload?: Record<string, unknown>,
  level: EventLevel = 'info'
): Promise<void> => {
  if (!getFlag('enterprise_event_tracking')) {
    return;
  }

  try {
    await fetch(`${MOBILE_CONFIG.siteUrl}/api/telemetry/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': getRequestId(),
      },
      body: JSON.stringify({
        name,
        level,
        payload: payload || {},
        timestamp: new Date().toISOString(),
        breadcrumbs: breadcrumbs.slice(-15),
      }),
    });
  } catch {
  }
};

export const trackError = async (name: string, error: unknown, payload?: Record<string, unknown>): Promise<void> => {
  const errorPayload = {
    ...(payload || {}),
    error: error instanceof Error ? error.message : String(error),
  };
  await trackEvent(name, errorPayload, 'error');
};
