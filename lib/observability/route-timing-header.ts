/**
 * Optional Server-Timing header for staging diagnostics (flag-gated).
 */

export function stagingServerTimingHeader(durationMs: number, name = 'app'): HeadersInit | undefined {
  if (process.env.ENABLE_STAGING_ROUTE_TIMING !== '1') {
    return undefined;
  }
  return {
    'Server-Timing': `${name};dur=${Math.round(durationMs)}`,
  };
}
