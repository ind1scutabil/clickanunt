# FAZA 20 — Controlled production deploy (DRAFT — do not execute without owner approval)

**Deploy SHA:** `c5435c1ce6a2383020954ae1c444b2723685e415`  
**From live:** `a40ccde76d223491098b9f19744d37954ccdac01`  
**Prerequisite:** FAZA 19 verdict was **BLOCKED** until P1-URL and P1-DIRTY are cleared.

## Gate 0 — hard stops (must PASS)

- [ ] `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL` = `https://www.clickanunt.ro` (no localhost)
- [ ] E2E flags absent in `.env` and PM2 env
- [ ] Stripe remains live pair (sk_live + pk_live) OR explicitly decided otherwise — **no test charges**
- [ ] Deploy strategy preserves `public/uploads` (dirty tree handled)
- [ ] Fresh backup created **and** restored to temporary DB with matching row counts
- [ ] Preflight: `Invoice.paymentId` duplicate groups = 0
- [ ] `npx prisma migrate status` understood (5 pending after checkout of SHA)
- [ ] Disk ≥ 5G free · RAM available · no long transactions
- [ ] Owner explicit approval recorded

## Ordered commands (illustrative)

```bash
ssh root@46.225.69.155
cd /var/www/clickanunt

# 0) env edits (manual) — then:
pm2 describe clickanunt   # confirm no E2E flags

# 1) backup + restore-verify (see REPORT.md)
./scripts/backup-db.sh pre-faza20-$(date -u +%Y%m%dT%H%M%SZ)
# ... restore to autoplat_restore_* and drop ...

# 2) fetch exact SHA (example git)
git fetch origin
git checkout --force c5435c1ce6a2383020954ae1c444b2723685e415
# OR release-directory pattern if adopted

npm ci
npx prisma generate
npm run build

# 3) migrate THEN reload on same SHA
npx prisma migrate deploy
pm2 reload clickanunt --update-env

# 4) smoke
curl -sf http://127.0.0.1:3000/api/health
curl -sf 'http://127.0.0.1:3000/api/listings?limit=1' >/dev/null
curl -sf https://www.clickanunt.ro/api/health
```

## Rollback (post-migrate)

- Reload only a build with Prisma client accepting `priceAmount` null (`ed22afed+` / `c5435c1c`).
- **Never** checkout `a40ccde7` or `ea6904b2` after migrate deploy.
