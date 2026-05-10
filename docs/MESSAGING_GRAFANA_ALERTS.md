# Messaging observability — Grafana / Prometheus alerts

Scrape endpoint: `GET /api/metrics/messaging` (consider protecting with `INTERNAL_METRICS_TOKEN` and header `x-internal-metrics-token` in production).

All series use the prefix `messaging_` and label `node_id` unless noted. Use `sum(...) by (...)` across replicas after scrape federation or per-job grouping.

## Redis disconnected / unhealthy

Subscriber errors (connection-level):

```promql
rate(messaging_redis_subscriber_errors_total[5m]) > 0
```

Combine with Redis reachability from your infra (Kubernetes probes, Redis exporter) if available.

## SSE spike disconnects

Elevated disconnect rate (tune thresholds per baseline):

```promql
sum(rate(messaging_sse_disconnects_total[5m])) > 50
```

Spike ratio vs prior window (requires recording rule or Grafana math):

```promql
sum(rate(messaging_sse_disconnects_total[5m]))
  /
(sum(rate(messaging_sse_disconnects_total[15m])) / 3) > 3
```

## Unread desync / staleness (proxy via app metrics)

Stale unread backlog is surfaced on the admin diagnostics API (`GET /api/admin/messaging/diagnostics`). For Prometheus-only signals, correlate:

- Elevated unread fetch latency:

```promql
histogram_quantile(0.95, sum(rate(messaging_http_unread_count_duration_seconds_bucket[5m])) by (le, node_id)) > 2
```

- Many undelivered / fallback deliveries (Redis or publish issues):

```promql
sum(rate(messaging_redis_publish_failures_total[5m])) > 1
```

```promql
sum(rate(messaging_local_fanout_fallback_deliveries_total[5m])) > 10
```

## High retry count (client reconnect storm)

Client-reported reconnect / transport-ended telemetry:

```promql
sum(rate(messaging_client_reconnect_reports_total[5m])) > 20
```

## Memory leak indicators

Heap pressure per Node worker (rising trend over hours is suspicious):

```promql
deriv(messaging_process_heap_used_bytes[1h]) > 0
```

Use longer windows and compare across deploys; pair with generic `nodejs_heap_*` or container memory if scraped elsewhere.

## Event queue lag / handler failures

SSE dispatch errors (dropped / failed writes to clients):

```promql
sum(rate(messaging_sse_handler_dispatch_errors_total[5m])) > 1
```

Invalid envelopes dropped from Redis fan-out:

```promql
sum(rate(messaging_redis_invalid_envelope_dropped_total[5m])) > 0.1
```

## Reference metric names

| Metric | Meaning |
|--------|---------|
| `messaging_sse_active_clients` | Open SSE messaging connections |
| `messaging_redis_publish_duration_seconds` | Redis publish latency |
| `messaging_http_message_post_duration_seconds` | Message POST latency |
| `messaging_http_unread_count_duration_seconds` | Unread sync latency |
| `messaging_client_reconnect_reports_total` | Reconnect telemetry from browsers |
| `messaging_sse_disconnects_total` | SSE stream closures |
| `messaging_redis_publish_failures_total` | Failed publishes |
| `messaging_sse_handler_dispatch_errors_total` | Handler dispatch failures |

Admin JSON snapshot: `/api/admin/messaging/diagnostics` (Bearer + `SYSTEM_HEALTH_VIEW`).
