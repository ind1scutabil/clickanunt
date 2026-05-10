# Migration notes — `messaging-stable`

**Refs:** Git branch `messaging-stable`, annotated tag `messaging-stable-1.0.0` (identical tip after publish).

This release bundles distributed messaging behavior, delivery/read observability fields, Prometheus/Sentry hooks, admin diagnostics, and related API/client updates. Apply in order below.

## 1. Dependencies

From the repo root:

```bash
npm ci
```

New or notable runtime packages for this line of work include `@sentry/node` and `prom-client` (see `package.json` / lockfile at this tag).

## 2. Database (Prisma)

Migration directory: `prisma/migrations/20260510194500_message_delivered_at/`

- Adds nullable column `messages.deliveredAt` (`TIMESTAMP(3)`).

Deploy:

```bash
npx prisma migrate deploy
```

**Post-deploy:** existing rows keep `deliveredAt` null until the application sets them; no backfill is required for correctness of older messages unless you define a separate data job.

## 3. Environment variables

| Variable | Purpose |
|----------|---------|
| `SENTRY_DSN` | Optional. Enables Sentry for messaging paths and forwards `captureError` when set. |
| `INTERNAL_METRICS_TOKEN` | Optional. If set, `GET /api/metrics/messaging` requires header `x-internal-metrics-token: <token>`. |
| `MESSAGING_NODE_ID` | Optional. Stable `node_id` label for logs/metrics; default is hostname + PID. |

Redis and existing messaging env vars (channels, presence prefix, etc.) unchanged unless documented in `docs/MESSAGING_DISTRIBUTED.md`.

## 4. Operations

- **Metrics scrape:** `GET /api/metrics/messaging` — wire into Prometheus; see `docs/MESSAGING_GRAFANA_ALERTS.md` for alert examples.
- **Admin diagnostics:** `GET /api/admin/messaging/diagnostics` — requires Bearer auth and `SYSTEM_HEALTH_VIEW`.
- **Client telemetry:** `POST /api/messages/telemetry` — used by the SSE client for reconnect reporting; ensure it is reachable from the browser (same origin/CORS as other API routes).

## 5. Verification checklist

- [ ] `npx prisma migrate status` — migration applied.
- [ ] `npm run build` succeeds.
- [ ] Health: send message, receive over SSE, confirm delivery/read flows if you use `deliveredAt`.
- [ ] Scrape `/api/metrics/messaging` and confirm `messaging_*` series appear.
- [ ] With `SENTRY_DSN` set in a staging slot, trigger a forced Redis error path and confirm an event (non-production first).
