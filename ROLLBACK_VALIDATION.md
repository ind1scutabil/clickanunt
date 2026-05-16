# Rollback Validation

**Production rollback commit (known good before this deploy):** `de738453`

---

## Rollback procedure (on VPS)

```bash
cd /var/www/clickanunt
./scripts/rollback.sh de738453
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
curl -sS -o /dev/null -w '%{http_code}\n' https://www.clickanunt.ro/
```

`rollback.sh` runs: `git checkout` → `npm ci` → `NODE_ENV=production npm run build` → `pm2 reload ecosystem.config.js --update-env`

---

## What rollback preserves

- Postgres data (no migration rollback in this deploy set)
- `public/uploads/` on disk
- `.env` on server (not in git)

---

## When to rollback

- PM2 restart loop after deploy
- `/api/health` 503 sustained
- Homepage/listings 5xx
- Stripe webhooks returning 500 (check logs)
- Memory pegged and OOM kills after reload

---

## Post-rollback verification

```bash
pm2 describe clickanunt | grep -E "status|restarts"
BASE_URL=https://www.clickanunt.ro node scripts/production/prod-smoke.mjs
```

---

## Re-deploy after fix

Fix on branch → commit → `CONFIRM_PROD_DEPLOY=1 npm run deploy:prod`
