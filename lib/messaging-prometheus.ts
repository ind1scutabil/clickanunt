/**
 * Prometheus (Grafana-ready) — metrici dedicate mesageriei, registru izolat.
 * Scrape: GET /api/metrics/messaging
 */

import {
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

import { messagingNodeId } from "@/lib/messaging-observability";
import { sseMetrics } from "@/lib/messaging-sse-metrics";

const registry = new Registry();
const PREFIX = "messaging";
function nodeLabels(): { node_id: string } {
  return { node_id: messagingNodeId() };
}

const sseActiveGauge = new Gauge({
  name: `${PREFIX}_sse_active_clients`,
  help: "Open SSE messaging connections on this worker.",
  labelNames: ["node_id"],
  registers: [registry],
});

const redisPublishDuration = new Histogram({
  name: `${PREFIX}_redis_publish_duration_seconds`,
  help: "Duration of Redis publish for messaging user channel.",
  labelNames: ["node_id"],
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});

const messagePostDuration = new Histogram({
  name: `${PREFIX}_http_message_post_duration_seconds`,
  help: "Duration of POST /api/messages/:userId handler.",
  labelNames: ["node_id"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const unreadFetchDuration = new Histogram({
  name: `${PREFIX}_http_unread_count_duration_seconds`,
  help: "Duration of GET /api/messages/unread-count.",
  labelNames: ["node_id"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

const redisInvalidEnvelope = new Counter({
  name: `${PREFIX}_redis_invalid_envelope_dropped_total`,
  help: "Inbound Redis payloads rejected (parse/validation/channel mismatch).",
  labelNames: ["node_id"],
  registers: [registry],
});

const redisPublishFailures = new Counter({
  name: `${PREFIX}_redis_publish_failures_total`,
  help: "Failed Redis publishes (before local fan-out fallback).",
  labelNames: ["node_id"],
  registers: [registry],
});

const redisSubscriberErrors = new Counter({
  name: `${PREFIX}_redis_subscriber_errors_total`,
  help: "Subscriber connection errors (ioredis duplicate).",
  labelNames: ["node_id"],
  registers: [registry],
});

const sseDisconnectsTotal = new Counter({
  name: `${PREFIX}_sse_disconnects_total`,
  help: "SSE messaging streams closed (client cancel/abort/normal).",
  labelNames: ["node_id"],
  registers: [registry],
});

const clientReconnectTelemetryTotal = new Counter({
  name: `${PREFIX}_client_reconnect_reports_total`,
  help: "Client-reported SSE reconnect / transport-ended events.",
  labelNames: ["node_id"],
  registers: [registry],
});

const localFanoutFallbackTotal = new Counter({
  name: `${PREFIX}_local_fanout_fallback_deliveries_total`,
  help: "Events delivered via in-process fallback (Redis down or publish fail).",
  labelNames: ["node_id"],
  registers: [registry],
});

const sseHandlerErrorsTotal = new Counter({
  name: `${PREFIX}_sse_handler_dispatch_errors_total`,
  help: "Errors thrown while dispatching payloads to SSE write callbacks.",
  labelNames: ["node_id"],
  registers: [registry],
});

const processHeapGauge = new Gauge({
  name: `${PREFIX}_process_heap_used_bytes`,
  help: "Node.js heap used (indicator for leaks / pressure).",
  labelNames: ["node_id"],
  registers: [registry],
});

/** Raportat din bus după succes la primul subscribe pe canal. */
const redisChannelSubscribeOpens = new Counter({
  name: `${PREFIX}_redis_channel_subscribe_opens_total`,
  help: "First subscription opened per canonical user Redis channel.",
  labelNames: ["node_id"],
  registers: [registry],
});

function labels() {
  return nodeLabels().node_id;
}

export function promObserveRedisPublish(durationMs: number, ok: boolean): void {
  const ln = labels();
  const sec = durationMs / 1000;
  redisPublishDuration.observe({ node_id: ln }, sec);
  if (!ok) redisPublishFailures.inc({ node_id: ln });
}

export function promObserveInvalidRedisEnvelope(): void {
  redisInvalidEnvelope.inc({ node_id: labels() });
}

export function promObserveRedisSubscriberError(): void {
  redisSubscriberErrors.inc({ node_id: labels() });
}

export function promObserveHttpMessagePost(durationMs: number): void {
  messagePostDuration.observe({ node_id: labels() }, durationMs / 1000);
}

export function promObserveUnreadFetch(durationMs: number): void {
  unreadFetchDuration.observe({ node_id: labels() }, durationMs / 1000);
}

export function promObserveSseDisconnect(): void {
  sseDisconnectsTotal.inc({ node_id: labels() });
}

export function promObserveClientReconnectTelemetry(): void {
  clientReconnectTelemetryTotal.inc({ node_id: labels() });
}

export function promObserveLocalFanoutFallback(count: number = 1): void {
  localFanoutFallbackTotal.inc({ node_id: labels() }, count);
}

export function promObserveSseHandlerDispatchError(count: number = 1): void {
  sseHandlerErrorsTotal.inc({ node_id: labels() }, count);
}

/** Primul refcount=1 după Redis SUBSCRIBE reușit. */
export function promObserveRedisChannelSubscribeOpen(): void {
  redisChannelSubscribeOpens.inc({ node_id: labels() });
}

function syncInternalGauges(): void {
  const ln = labels();
  sseActiveGauge.set({ node_id: ln }, sseMetrics.activeSseClients);
  processHeapGauge.set({ node_id: ln }, process.memoryUsage().heapUsed);
}

/** Text Prometheus pentru scraping. */
export async function metricsMessagingPrometheusText(): Promise<string> {
  syncInternalGauges();
  return registry.metrics();
}
