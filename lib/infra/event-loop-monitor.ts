import { monitorEventLoopDelay, type IntervalHistogram } from "perf_hooks";

let histogram: IntervalHistogram | null = null;

function ensureMonitor(): IntervalHistogram {
  if (!histogram) {
    histogram = monitorEventLoopDelay({ resolution: 20 });
    histogram.enable();
  }
  return histogram;
}

/** Mean event loop delay (ms) since last reset; only meaningful when ops enabled. */
export function sampleEventLoopLagMs(reset = true): number | null {
  if (process.env.ENABLE_PRODUCTION_HEALTH_OPS !== "1") {
    return null;
  }
  const h = ensureMonitor();
  const meanNs = h.mean;
  if (reset) h.reset();
  if (!Number.isFinite(meanNs) || meanNs <= 0) return 0;
  return Math.round(meanNs / 1e6 * 100) / 100;
}

export function sampleEventLoopLagMaxMs(): number | null {
  if (process.env.ENABLE_PRODUCTION_HEALTH_OPS !== "1") {
    return null;
  }
  const h = ensureMonitor();
  const maxNs = h.max;
  return Number.isFinite(maxNs) && maxNs > 0
    ? Math.round(maxNs / 1e6 * 100) / 100
    : 0;
}
