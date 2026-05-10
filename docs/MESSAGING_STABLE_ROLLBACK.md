# Rollback notes — `messaging-stable`

Use this when you must revert production (or staging) after deploying the **`messaging-stable`** branch or tag **`messaging-stable-1.0.0`** while keeping downtime and risk bounded.

## 1. Decide rollback strategy

**A — Application rollback only (code + deps):** Deploy the previous Git ref (commit or tag) that was known good **without** reversing the DB column. This is safe if `deliveredAt` is nullable and older app versions ignore unknown columns via Prisma client generation — **verify** your previous build’s Prisma schema: if it did **not** include `deliveredAt`, Postgres still accepts the column; Prisma Client from the old build must not SELECT `deliveredAt` if absent from schema (older client typically omits it). Prefer testing rollback on staging.

**B — Full rollback including schema:** Remove `deliveredAt` only if business requires it (rare). That implies a dedicated migration dropping the column and coordinating all app instances on a schema-compatible version.

Recommended default: **A** (revert deployment image/commit; keep DB column).

## 2. Deploy previous artifact

```bash
git checkout <previous-stable-ref>
# rebuild image / redeploy platform as per your pipeline
```

Record the ref you rollback **from** (`messaging-stable` or deployed SHA) for audit.

## 3. Observability side effects after rollback

| Component | Effect |
|-----------|--------|
| `/api/metrics/messaging` | Gone if old build has no route; Prometheus scrape may 404 — silence or remove job temporarily. |
| `INTERNAL_METRICS_TOKEN` | No effect on old builds without the route. |
| Sentry (`SENTRY_DSN`) | Older code may emit fewer/different events; optional to unset during rollback window. |
| Admin `/admin/messaging` | Missing on old UI; diagnostics API 404 if route absent. |

## 4. Database

- **Keeping `deliveredAt`:** no DB action required for rollback A.
- **Dropping column (rollback B):** run a reversible migration only after all traffic is on a codebase that does not reference `deliveredAt`, and snapshot/backup first.

Example (Postgres — **destructive**, only if required):

```sql
ALTER TABLE "messages" DROP COLUMN IF EXISTS "deliveredAt";
```

## 5. Redis / SSE

No mandatory Redis schema migration was introduced for observability counters (in-process/registry). After rollback, clients may still POST to `/api/messages/telemetry` if cached bundles call it — expect 404; clients should degrade silently.

Reconnect storms: if rollback was due to incidents, temporarily reduce rollout speed and watch generic error rates until stable.

## 6. Communication

- Note incident window, from/to SHAs, and whether DB was rolled back.
- Re-enable messaging metrics scrape when redeploying `messaging-stable` or a forward fix.
