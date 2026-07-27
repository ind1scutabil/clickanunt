# Staging checklist — backup / migrate / deploy / rollback

Use only against a **real** staging host. Leave items unchecked while values are `REQUIRED_*` / LIPSĂ.

## Before first staging migrate

- [ ] Staging host identified (not `46.225.69.155` unless explicit isolated exception)
- [ ] Staging domain + TLS live
- [ ] Dedicated Postgres DB (name ≠ `autoplat` on prod)
- [ ] Dedicated Redis / storage / Stripe test / email sandbox
- [ ] Server `.env` from `.env.staging.example` (no secrets in Git)
- [ ] `STAGING_SITE=1`, no `E2E_DISABLE_RATE_LIMIT`, no `CLICKANUNT_E2E_SERVER`
- [ ] PM2 `ecosystem.staging.config.js` present
- [ ] Nginx staging site enabled (template without placeholders)
- [ ] `npx prisma migrate status` coherent on staging DB

## Each deploy

- [ ] Working tree clean; `STAGING_EXPECTED_SHA` = intended commit
- [ ] `STAGING_BACKUP_VERIFIED=1` after successful staging DB backup
- [ ] `CONFIRM_STAGING_DEPLOY=1`
- [ ] `node scripts/staging/preflight-deploy.mjs` PASS
- [ ] Deploy exact SHA only
- [ ] Health `200` on staging domain (not production)
- [ ] Smoke: create / edit / draft listing (price + job salary)
- [ ] Integrity SQL from price/salary runbook

## Rollback (application)

- [ ] Only to schema-compatible SHA (`ed22afed`, `3c924c72`, or later with same expand)
- [ ] **Never** roll app back to `ea6904b2` after expand migration
- [ ] Do not reverse expand migration casually; follow `docs/PRICE_SALARY_MIGRATION_RUNBOOK.md`

## Production

- [ ] Separate approval phase
- [ ] Staging green first
- [ ] Production backup verified
- [ ] Never use this checklist as permission to touch prod from staging scripts
