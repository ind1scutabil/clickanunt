# Runbook: User.sessionVersion (session revocation)

## Purpose

Expand-only column `users.sessionVersion` (JWT claim `sv`) invalidates outstanding access/refresh JWTs after security events without a Session table.

## Preflight (staging/production — read-only)

```sql
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS null_sv FROM users WHERE "sessionVersion" IS NULL; -- expect 0 after migrate
SELECT MIN("sessionVersion") AS min_sv, MAX("sessionVersion") AS max_sv FROM users;
SELECT COUNT(*) AS pending_migrations FROM _prisma_migrations WHERE finished_at IS NULL;
```

Default is `0`. Existing JWTs without `sv` are treated as version `0` until the first bump.

## Apply (local/test only in this phase)

```bash
npx prisma migrate deploy
npx prisma generate
```

Migration: `prisma/migrations/20260727210000_user_session_version/migration.sql`

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
```

Do **not** apply externally from this agent phase.

## Bump triggers

- password change (current device re-issued cookies)
- password reset (must re-login)
- admin password reset
- ban
- soft-delete / deactivate
- logout-all (password confirmed; current browser re-issued)

## Rollback (app)

Compatible: old app ignores unknown column; new app requires column. Prefer expand-only keep column; do not DROP in emergency without coordinated deploy.

## Browser rollout note

Web clients that relied only on `localStorage` tokens will be logged out until they sign in again (cookies). Legacy LS keys are deleted on bootstrap/logout; never promoted into cookies.
