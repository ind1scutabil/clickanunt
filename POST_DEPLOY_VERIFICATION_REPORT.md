# Raport verificare post-deploy — producție live

**Data / oră (UTC):** 2026-05-14 ~19:41 UTC  
**Branch:** `messaging-stable`  
**Folder deploy VPS:** `/var/www/clickanunt`  
**Server:** `root@46.225.69.155` (din `scripts/deploy-prod-from-local.sh`)

---

## A. SHA-uri Git

| Moment | SHA complet |
|--------|-------------|
| **Producție înainte de `git pull`** | `8007cd0146554e28da6cec26f354e5c607f1c4b7` |
| **Producție după deploy (HEAD pe VPS)** | `d23e9eddfd8f85181d188289e14e1e26a24c2ff2` |

**Rollback (pregătit, nefolosit):** pe VPS, din `/var/www/clickanunt`:

```bash
./scripts/rollback.sh 8007cd0146554e28da6cec26f354e5c607f1c4b7
```

---

## B. Backup DB (obligatoriu — confirmat)

| Pas | Status | Detaliu |
|-----|--------|---------|
| Director `backups/` pe VPS | Creat la prima rulare backup | Înainte nu exista |
| Fișier backup | **OK** | `/var/www/clickanunt/backups/pre-deploy-20260514-live.sql.gz` (~48K după gzip) |
| Comandă | `./scripts/backup-db.sh pre-deploy-20260514-live` | Cu `set -a; . ./.env; set +a` pentru credențiale non-interactive |

---

## C. Migration check (înainte de pull)

| Pas | Rezultat |
|-----|----------|
| `npx prisma migrate status` pe VPS (înainte de pull) | **Database schema is up to date** |
| `prisma migrate reset` | **Nu rulat** |
| După deploy: `npx prisma migrate deploy` | **No pending migrations to apply** |

---

## D. Comenzi rulate (rezumat)

1. SSH: `git rev-parse HEAD` pe VPS → SHA înainte (§A).  
2. SSH: backup cu `.env` încărcat → `pre-deploy-20260514-live.sql.gz`.  
3. SSH: `npx prisma migrate status` (read-only).  
4. Local: `npm run deploy:prod` → `git push origin messaging-stable`, apoi pe VPS: `git pull`, `npm ci`, `NODE_ENV=production npm run build`, `npx prisma migrate deploy`, `pm2 reload ecosystem.config.js --update-env`.  
5. SSH: `git rev-parse HEAD` după deploy → §A.  
6. `curl` smoke pe `https://www.clickanunt.ro` / `https://clickanunt.ro` (vezi §E).

---

## E. Verificări live imediate

### Automat (HTTP, fără autentificare)

| Verificare | HTTP | Rezultat |
|------------|------|----------|
| Homepage `https://www.clickanunt.ro/` | 200 | OK |
| Homepage apex `https://clickanunt.ro/` | 200 | OK |
| `/api/health` | 200 | `{"status":"ok","database":"up",...}` |
| `/auth/login` | 200 | OK |
| `/listings/new` (publicare — încărcare pagină) | 200 | OK |
| `/admin/moderation` (încărcare pagină; RBAC pe API rămâne server-side) | 200 | OK |
| `GET /api/payments/stripe-publishable-key` | 200 | Endpoint răspunde (fără plată test) |

### Manual (browser, conturi reale) — de completat de operator

| Verificare | OK / Fail | Note |
|------------|-----------|------|
| Homepage mobil (layout real) | | |
| Login admin | | |
| Logout | | |
| Meniu mobil: Moderare / Admin (staff) | | |
| User normal: fără acces admin | | |
| Publicare anunț (submit complet) | | |
| Upload poze la anunț | | |
| Flux promovare Stripe (încărcare + plată test doar dacă doriți) | | |
| Moderare anunțuri / utilizatori (acțiuni) | | |

---

## F. Incidente / erori critice

**Niciun incident critic** în timpul deploy-ului. Build VPS: succes (warning-uri OpenTelemetry/Sentry cunoscute). PM2 reload: OK.

---

## G. Semnătură

- [x] Backup DB confirmat înainte de pull  
- [x] SHA rollback salvat (§A)  
- [x] Deploy din `/var/www/clickanunt`, branch `messaging-stable`  
- [ ] Toate verificările manuale din §E completate de operator  

**Deploy executat:** da (2026-05-14, sesiune documentată mai sus).

---

*După completarea rândurilor manuale din §E, păstrați SHA-ul de rollback încă 7–14 zile.*
