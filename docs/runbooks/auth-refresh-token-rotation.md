# Runbook: Auth refresh token rotation (`auth_refresh_tokens`)

## Purpose

Single-use refresh JWTs with SHA-256 hashes in Postgres. Replay of a used token revokes that device **family** only (not other devices).

## Preflight (read-only)

```sql
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS refresh_rows FROM auth_refresh_tokens;
SELECT COUNT(*) AS active FROM auth_refresh_tokens WHERE "usedAt" IS NULL AND "revokedAt" IS NULL;
SELECT COUNT(*) AS dup_hashes FROM (
  SELECT "tokenHash" FROM auth_refresh_tokens GROUP BY 1 HAVING COUNT(*) > 1
) d;
SELECT COUNT(*) AS pending FROM _prisma_migrations WHERE finished_at IS NULL;
```

## Apply (local/test only in this phase)

```bash
npx prisma migrate deploy
npx prisma generate
```

Migration: `prisma/migrations/20260727220000_auth_refresh_token_rotation/`

## Legacy refresh JWTs (strategy A)

Refresh JWTs issued **before** this migration have no DB row. Refresh returns revoked/invalid → client must re-login.

Access JWTs remain valid until expiry or `sessionVersion` bump.

## Rollout impact

- Web: cookie refresh fails once until re-login (or until access still valid).
- Mobile: SecureStore refresh fails → logout / re-login.
- Multiple devices: independent families; logout current revokes presented family only.

## Rollback

- App rollback to `d33b34b5`: ignores table (expand-only OK).
- Minimum SHA that **requires** the table for refresh: this commit onward.
- Do not DROP table in emergency without coordinated downtime.

## Cleanup

Lazy batch on refresh (`lazyCleanupRefreshTokens`). Optional VPS cron (inert until scheduled):

```sql
DELETE FROM auth_refresh_tokens
WHERE "expiresAt" < NOW() - INTERVAL '30 days'
   OR (("usedAt" IS NOT NULL OR "revokedAt" IS NOT NULL)
       AND "createdAt" < NOW() - INTERVAL '30 days')
LIMIT 1000;
```

Do not claim this cron runs in production until installed.
