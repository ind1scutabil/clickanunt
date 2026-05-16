/**
 * Load profile metrics — client-side latency & payload measurement (read-only GETs).
 */

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export function summarizeLatencies(latenciesMs) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: Math.round(percentile(sorted, 0.5)),
    p95: Math.round(percentile(sorted, 0.95)),
    p99: Math.round(percentile(sorted, 0.99)),
    min: Math.round(sorted[0] ?? 0),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
    mean: sorted.length
      ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
      : 0,
  };
}

export function summarizeBytes(bytes) {
  if (bytes.length === 0) {
    return { count: 0, avg: 0, max: 0, total: 0 };
  }
  const total = bytes.reduce((a, b) => a + b, 0);
  return {
    count: bytes.length,
    avg: Math.round(total / bytes.length),
    max: Math.max(...bytes),
    total,
  };
}

/**
 * Concurrent read-only load for a single URL builder.
 */
export async function runLoadProfile({
  name,
  requestFn,
  concurrency = 10,
  durationSec = 15,
}) {
  const end = Date.now() + durationSec * 1000;
  const latencies = [];
  const bytes = [];
  const statusCounts = {};
  let errors = 0;
  let completed = 0;

  async function worker() {
    while (Date.now() < end) {
      const t0 = performance.now();
      try {
        const result = await requestFn();
        const elapsed = performance.now() - t0;
        latencies.push(elapsed);
        const status = result.status ?? 0;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        if (result.bytes != null) bytes.push(result.bytes);
        if (!result.ok) errors += 1;
      } catch {
        errors += 1;
        latencies.push(performance.now() - t0);
      }
      completed += 1;
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  );

  return {
    profile: name,
    concurrency,
    durationSec,
    completed,
    errors,
    errorRate: completed > 0 ? Number((errors / completed).toFixed(4)) : 0,
    rps: Number((completed / durationSec).toFixed(2)),
    latencyMs: summarizeLatencies(latencies),
    responseBytes: summarizeBytes(bytes),
    statusCounts,
    sampledAt: new Date().toISOString(),
  };
}

export async function fetchGetMetrics(url, init = {}) {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', ...init });
  const buf = await res.arrayBuffer();
  return {
    ok: res.ok,
    status: res.status,
    bytes: buf.byteLength,
    headers: {
      serverTiming: res.headers.get('server-timing'),
      cacheControl: res.headers.get('cache-control'),
    },
  };
}

import { execSync } from 'node:child_process';

export function sampleProcessStats(pid) {
  if (!pid) return null;
  try {
    const out = execSync(`ps -p ${pid} -o %cpu=,rss= 2>/dev/null`, {
      encoding: 'utf8',
    }).trim();
    if (!out) return null;
    const [cpu, rssKb] = out.split(/\s+/).map((s) => Number(s.trim()));
    return {
      pid: Number(pid),
      cpuPercent: cpu,
      rssMb: Math.round((rssKb || 0) / 1024),
    };
  } catch {
    return null;
  }
}
