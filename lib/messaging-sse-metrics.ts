/**
 * Metrici SSE / messaging per proces Node (PM2 fork = metrici independente).
 * Agregarea cross-instance: folosiți Prometheus pushgateway sau log shipping.
 */

const instance =
  typeof process.env.PM2_INSTANCE_ID === "string" && process.env.PM2_INSTANCE_ID.length > 0
    ? process.env.PM2_INSTANCE_ID
    : String(process.pid);

export function messagingInstanceTag(): string {
  return instance;
}

type LatencyAgg = {
  samples: number;
  sumMs: number;
};

const latencyPub: LatencyAgg = { samples: 0, sumMs: 0 };

export const sseMetrics = {
  instance,
  activeSseClients: 0,
  sseConnectionsAccepted: 0,
  sseConnectionsClosed: 0,
  sseHeartbeatsOutbound: 0,
  redisPublishes: 0,
  redisPublishFailures: 0,
  redisDeliveriesInbound: 0,
  redisInvalidEnvelopeDropped: 0,
  fallbackLocalDeliveries: 0,
  sseHandlerDispatchErrors: 0,
};

export function sseClientConnected(): void {
  sseMetrics.sseConnectionsAccepted += 1;
  sseMetrics.activeSseClients += 1;
}

export function sseClientDisconnected(): void {
  sseMetrics.sseConnectionsClosed += 1;
  sseMetrics.activeSseClients = Math.max(0, sseMetrics.activeSseClients - 1);
}

export function sseHeartbeatSent(): void {
  sseMetrics.sseHeartbeatsOutbound += 1;
}

export function recordRedisPublish(durationMs: number, ok: boolean): void {
  if (ok) {
    sseMetrics.redisPublishes += 1;
    latencyPub.samples += 1;
    latencyPub.sumMs += durationMs;
  } else {
    sseMetrics.redisPublishFailures += 1;
  }
}

export function recordRedisInboundDelivery(): void {
  sseMetrics.redisDeliveriesInbound += 1;
}

export function recordInvalidEnvelope(): void {
  sseMetrics.redisInvalidEnvelopeDropped += 1;
}

export function recordFallbackLocalDelivery(count: number): void {
  sseMetrics.fallbackLocalDeliveries += count;
}

export function recordSseHandlerDispatchError(count: number = 1): void {
  sseMetrics.sseHandlerDispatchErrors += count;
}

export function getMessagingSseMetricsSnapshot(): Record<string, number | string> {
  const avgPub =
    latencyPub.samples > 0 ? latencyPub.sumMs / latencyPub.samples : 0;
  return {
    instance: sseMetrics.instance,
    activeSseClients: sseMetrics.activeSseClients,
    sseConnectionsAccepted: sseMetrics.sseConnectionsAccepted,
    sseConnectionsClosed: sseMetrics.sseConnectionsClosed,
    sseHeartbeatsOutbound: sseMetrics.sseHeartbeatsOutbound,
    redisPublishes: sseMetrics.redisPublishes,
    redisPublishFailures: sseMetrics.redisPublishFailures,
    redisDeliveriesInbound: sseMetrics.redisDeliveriesInbound,
    redisInvalidDropped: sseMetrics.redisInvalidEnvelopeDropped,
    fallbackLocalDeliveries: sseMetrics.fallbackLocalDeliveries,
    sseHandlerDispatchErrors: sseMetrics.sseHandlerDispatchErrors,
    avgRedisPublishLatencyMsRounded: Math.round(avgPub * 1000) / 1000,
  };
}
