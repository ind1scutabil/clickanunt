# Production Monitoring Guide (current infra)

**VPS:** `root@46.225.69.155`  
**App path:** `/var/www/clickanunt`  
**No secrets in commands below.**

---

## PM2

```bash
pm2 status
pm2 describe clickanunt
pm2 monit
pm2 logs clickanunt --lines 100
pm2 logs clickanunt --err --lines 50
```

Watch for restart loops: `restarts` increasing every minute.

---

## Health endpoint

```bash
curl -sS https://www.clickanunt.ro/api/health | jq .
```

With ops (only when `ENABLE_PRODUCTION_HEALTH_OPS=1` in `.env`):

```bash
curl -sS https://www.clickanunt.ro/api/health | jq '.ops'
```

---

## Memory / CPU (on VPS)

```bash
free -h
uptime
ps aux --sort=-%mem | head -8
```

---

## Disk / uploads

```bash
df -h /
du -sh /var/www/clickanunt/public/uploads
```

---

## Database (read-only)

```bash
sudo -u postgres psql -d clickanunt -c "SELECT 1;"
sudo -u postgres psql -d clickanunt -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
```

---

## Upload failures (structured logs)

```bash
pm2 logs clickanunt --lines 200 | grep '"kind":"upload"'
```

---

## Stripe / payment failures

```bash
pm2 logs clickanunt --lines 200 | grep '"kind":"payment"'
```

Webhook endpoint (expect 400 without signature — not 500):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://www.clickanunt.ro/api/payments/webhook
```

---

## Safe reload

```bash
cd /var/www/clickanunt
./scripts/production/pm2-reload-safe.sh
```

---

## Local read-only smoke

```bash
BASE_URL=https://www.clickanunt.ro node scripts/production/prod-smoke.mjs
```
