#!/usr/bin/env node
/**
 * SSE hold test — opens /api/messages/events briefly (read-only, no publish).
 * Requires LOAD_AUTH_BEARER (JWT for ?token=) and LOAD_ALLOW_STAGING=1.
 */
import { resolveBaseUrl, assertLoadTestAllowed, requireStagingAuth } from './lib/guard.mjs';
import { summarizeLatencies } from './lib/metrics.mjs';

const base = resolveBaseUrl();
assertLoadTestAllowed(base);
const { token } = requireStagingAuth();

const holdSec = Number(process.env.LOAD_SSE_HOLD_SEC ?? 8);
const connections = Number(process.env.LOAD_SSE_CONNECTIONS ?? 5);
const url = new URL(`/api/messages/events?token=${encodeURIComponent(token)}`, base).href;

const connectLatencies = [];
let connected = 0;
let failed = 0;

async function holdOneConnection() {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), holdSec * 1000);
  const t0 = performance.now();
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (res.status !== 200) {
      failed += 1;
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) {
      failed += 1;
      return;
    }
    connected += 1;
    connectLatencies.push(performance.now() - t0);
    while (!ac.signal.aborted) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
    failed += 1;
  } finally {
    clearTimeout(timer);
  }
}

await Promise.all(
  Array.from({ length: connections }, () => holdOneConnection())
);

console.log(
  JSON.stringify(
    {
      profile: 'sse-hold',
      url: url.replace(/token=[^&]+/, 'token=***'),
      holdSec,
      connections,
      connected,
      failed,
      connectLatencyMs: summarizeLatencies(connectLatencies),
      note: 'Measure activeSseClients via MESSAGING_METRICS_SECRET on server',
      sampledAt: new Date().toISOString(),
    },
    null,
    2
  )
);
