# Runbook: Email verification tokens (`auth_email_verification_tokens`)

## Purpose

Single-use email verification / email-change tokens stored as SHA-256 hashes only.
Raw tokens are delivered only via the email adapter / test outbox — never in DB or production logs.

## Preflight (read-only)

```sql
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS verify_rows FROM auth_email_verification_tokens;
SELECT COUNT(*) AS active FROM auth_email_verification_tokens
  WHERE "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > NOW();
SELECT COUNT(*) AS unverified FROM users WHERE "emailVerified" = false AND "deletedAt" IS NULL;
SELECT COUNT(*) AS pending FROM _prisma_migrations WHERE finished_at IS NULL;
```

## Apply (local/test only in this phase)

```bash
npx prisma migrate deploy
npx prisma generate
```

Migration: `prisma/migrations/20260727230000_auth_email_verification_tokens/`

## Behaviour

- Register / register-extended / admin create user: issue `email_verify` token + dispatch email (non-blocking).
- `POST /api/auth/verify-email` with `{ token }`: consume single-use, set `emailVerified=true`.
- `POST /api/auth/resend-verification`: anti-enumeration + rate limit + 60s cooldown.
- `POST /api/auth/change-email`: password required; email changes immediately to unverified; old tokens revoked; notice to previous inbox (no sensitive link); new token to new email; `sessionVersion` bump + cookie reissue.
- Link origin: `publicSiteOrigin()` / `siteOrigin()` allowlist — never request Host.

## Enforcement

`REQUIRE_EMAIL_VERIFIED` defaults off (`lib/auth/email-verified-gate.ts`).
This phase does **not** block login, publish, messages, or phone reveal.

## Outbox / tests

Set `EMAIL_OUTBOX=1` or `NODE_ENV=test` to capture tokens in process memory via
`lib/email/verification-outbox.ts` (`latestVerificationTokenForUser`).

Do not send real SMTP in CI. Mock transporter is used when SMTP_* is unset.

## Cleanup

Lazy batch on successful verify (`lazyCleanupEmailVerificationTokens`). Optional VPS cron (inert until scheduled):

```sql
DELETE FROM auth_email_verification_tokens
WHERE "expiresAt" < NOW() - INTERVAL '30 days'
   OR (("usedAt" IS NOT NULL OR "revokedAt" IS NOT NULL)
       AND "createdAt" < NOW() - INTERVAL '30 days');
```

Do not claim this cron runs in production until installed.

## Rollback

- Expand-only table: app rollback ignores unused table safely.
- Do not DROP without coordinated downtime if tokens were issued.
