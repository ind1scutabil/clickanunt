# Staging environment — design & runbook (no provisioning)

**Status:** design + repo scaffolding only. Host / DB / domain / secrets = **LIPSĂ** until the owner provisions them.

This document does **not** authorize buying servers, changing DNS, opening firewall ports, or deploying.

## Why staging is blocked today

| Need | State |
|------|--------|
| Distinct staging host | **LIPSĂ** — only concrete host in repo docs is production `46.225.69.155` |
| Distinct staging DB | **LIPSĂ** — production DB name documented as `autoplat` |
| Staging domain + TLS | **LIPSĂ** — `staging.example.com` is placeholder only |
| `ecosystem.staging*.config.js` | Present in repo (scaffold) — not running anywhere |
| Staging secrets in CI | **LIPSĂ** |
| Production as staging | **FORBIDDEN** |

## Architecture options (evaluation)

| Option | Isolation | Prod risk | Cost | Fit |
|--------|-----------|-----------|------|-----|
| **A. Separate VPS** | Strong (CPU/RAM/disk/net) | Low | Paid VPS | Best match to current PM2+Nginx+Postgres stack |
| **B. Same VPS, separate runtime** | Partial — shared CPU/RAM/disk/net/admin | Medium–High | Low | Possible later with `ALLOW_STAGING_ON_PROD_HOST=1`; **not** equivalent to A |
| **C. Managed preview** | Strong if separate | Low | Platform fees | No existing Vercel/Fly preview pipeline in repo |
| **D. Docker/VM on existing infra** | Medium–Strong | Low–Med | Ops time | `docker-compose.yml` is local Postgres only |
| **E. Local team-only** | Strong vs prod users | Low | None | Good for smoke; not a shared staging URL |

**Recommendation (pending budget/access):** Option **A** once the owner supplies host, domain, and DB. Until then, use **E** for engineering validation. Do **not** choose B without accepting shared-resource risk.

## Required components (must be real — no invented values)

1. **Compute:** hostname + IP → fill `REQUIRED_STAGING_HOST` / `STAGING_DEPLOY_SERVER`
2. **PostgreSQL:** separate DB name, user, credentials, backups → `REQUIRED_STAGING_DATABASE_URL` (never `autoplat` on prod host)
3. **Runtime:** dir `/var/www/clickanunt-staging` (or chosen path), port **3001**, PM2 name `clickanunt-staging`, `STAGING_SITE=1`
4. **Domain + TLS:** dedicated subdomain → `REQUIRED_STAGING_DOMAIN` + cert; Nginx template: `infrastructure/nginx/clickanunt-staging.example.conf`
5. **Externals:** Stripe **test** keys; email sandbox or off; analytics off; separate S3/R2 bucket; separate Redis
6. **Security:** noindex (`STAGING_SITE=1`), robots deny, optional HTTP basic auth, **no** E2E bypass flags
7. **Ops:** `/api/health`, backup before migrate, deploy **exact SHA**, rollback only to schema-compatible SHA (`ed22afed` / `3c924c72`+)

## Repo files

- `.env.staging.example`
- `ecosystem.staging.config.js` / `ecosystem.staging.cluster.config.js`
- `scripts/staging/preflight-deploy.mjs`
- `scripts/deploy-staging-from-local.sh` (refuses prod / placeholders)
- `.github/workflows/staging-deploy.yml` (manual; stops without secrets)
- `docs/STAGING_CHECKLIST.md`
- `tests/unit/staging-deploy-preflight.test.ts`

## Owner next step (exact)

1. Decide A vs E (and budget for A).
2. Provision host + DNS + TLS + Postgres + Redis/storage **only after approval**.
3. Fill server `.env` from `.env.staging.example` (secrets stay on server).
4. Run `CONFIRM_STAGING_DEPLOY=1 … node scripts/staging/preflight-deploy.mjs`.
5. Backup → `prisma migrate deploy` on staging → deploy exact SHA → smoke.
6. Only then consider production migrate/deploy in a separate approved phase.

## Confirmations

- No production deploy from this scaffolding
- No production DB URL
- No Stripe LIVE
- No DNS / paid resources created by agents without approval
