/**
 * In-process rolling API latency samples (no secrets). Populated when
 * ENABLE_PRODUCTION_HEALTH_OPS=1 via security middleware.
 */

const MAX_SAMPLES = 200;
const samples: number[] = [];

export function recordRequestDurationMs(ms: number): void {
  if (process.env.ENABLE_PRODUCTION_HEALTH_OPS !== "1") return;
  if (!Number.isFinite(ms) || ms < 0) return;
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function getRequestMetricsSummary(): {
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
} | null {
  if (process.env.ENABLE_PRODUCTION_HEALTH_OPS !== "1" || samples.length === 0) {
    return null;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const p = (q: number) => {
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
    return Math.round(sorted[idx] ?? 0);
  };
  return {
    sampleCount: sorted.length,
    p50Ms: p(0.5),
    p95Ms: p(0.95),
    maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
  };
}
