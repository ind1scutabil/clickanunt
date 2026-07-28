# FAZA 19 — Production readiness (no paid staging)

**Date:** 2026-07-28 (UTC)  
**Candidate SHA:** `c5435c1ce6a2383020954ae1c444b2723685e415`  
**Live SHA:** `a40ccde76d223491098b9f19744d37954ccdac01` (`messaging-stable`)  
**This phase:** read-only on production + local simulation only. **No deploy / migrate / PM2 reload.**

## A. Verdict

# BLOCKED

Nu este **READY FOR CONTROLLED PRODUCTION DEPLOY** până când P1-urile de mai jos sunt remediate în FAZA 20 (înainte de migrate/switch).

**Nivel de risc factual dacă s-ar forța deploy acum: RIDICAT** — nu din cauza migrărilor (DB mică, simulare ×2 OK), ci din configurația live (`NEXTAUTH_URL` / app URLs pe localhost) + working tree murdar pe server + backup live vechi neverificat pe server.

Migrările în sine: **risc scăzut–mediu** pe datele observate (48 listings, 0 duplicate `paymentId`, 0 Job-uri, expand-only).

## B. HEAD / local / remote

| Item | Valoare |
|------|---------|
| Branch | `feat/category-price-and-salary-model` |
| Local | `c5435c1c…` |
| Remote | `c5435c1c…` (0/0) |
| Tree | curat (înainte de docs commit) |
| Base PR | `ea6904b2` |
| Commits live→HEAD | 27 |
| Migrări noi vs live | exact 5 |

## C–D. Producție read-only

| Item | Observat |
|------|----------|
| Host | `ubuntu-4gb-nbg1-1` |
| OS | Ubuntu 22.04.5 LTS |
| CPU | 2× AMD EPYC-Genoa |
| RAM | 3.7Gi total · ~2.8Gi available |
| Disk | 75G · 18% used · ~60G free |
| Load | ~0 · uptime 60d |
| Node | v25.6.1 · npm 11.9.0 |
| PostgreSQL | 14.23 · primary · DB `autoplat` ~17MB |
| Redis | active · PONG · `:6379` localhost |
| PM2 | 6.0.14 · `clickanunt` online · pid 1426825 · restarts 27 · unstable 0 · fork · NODE_ENV production |
| Listen | `:22`, `:80` nginx, `:3000` next (0.0.0.0), `:5432` local, `:6379` local |
| Nginx | `nginx -t` OK · HTTP-only origin (Cloudflare terminates TLS) |
| Git live | branch `messaging-stable` · HEAD `a40ccde7` |
| Working tree | **dirty** (~19 `public/uploads/*` + `backups/`) |
| BUILD_ID live | `F_sjNvi7qpRMO7kk_Lw1c` |
| Health local | 200 |
| Health public | 200 (Cloudflare) |
| `/api/listings` | 200 |
| Homepage / login | 200 |
| `/admin` anon | 404 |
| SSL public | Cloudflare/Google Trust · `notAfter=Sep 2 2026` · CN=clickanunt.ro |

## E. Config environment (fără valori)

| Variabilă | Există | Format aparent | Risc | Acțiune FAZA 20 |
|-----------|--------|----------------|------|-----------------|
| DATABASE_URL | da | postgres_url | ok | păstrează |
| JWT_SECRET / NEXTAUTH_SECRET | da | SET | ok | păstrează |
| STRIPE_SECRET_KEY | da | **sk_live** | ok live | nu testa charge |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | da | **pk_live** | coerent cu secret | ok |
| STRIPE_WEBHOOK_SECRET | da | SET | necesar live | ok |
| E2E_DISABLE_RATE_LIMIT | nu | — | ok | rămână absent |
| CLICKANUNT_E2E_SERVER | nu | — | ok | rămână absent |
| STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION | nu | — | ok | rămână absent |
| USE_IN_MEMORY_DB | da | `false` | ok | |
| NEXTAUTH_URL | da | **localhost** | **P1** | set `https://www.clickanunt.ro` |
| NEXT_PUBLIC_APP_URL | da | **localhost** | **P1** | idem |
| NEXT_PUBLIC_BASE_URL | da | **localhost** | **P1** | idem |
| CRON_SECRET | nu | — | P2 (cron fail-closed) | setează secret puternic |
| REDIS_URL | nu | — | P2 | setează dacă app așteaptă Redis distribuit |
| CSRF_SECRET | nu | — | P2 | verifică fallback |
| COOKIE_DOMAIN / SITE_ORIGIN | nu | — | P2 | aliniază la `.clickanunt.ro` dacă e necesar |
| SMTP_* | partial | HOST/PASS empty | P2 email | nu pretinde SMTP |

## F–G. DB preflight + schema vs migrări

**Schema live = punct de plecare așteptat pentru cele 5 migrări PR.**

| Check | Rezultat |
|-------|----------|
| Migrări failed active | 1 rând istoric `add_credits_balance` rolled_back (nu blochează pending-urile noi) |
| Ultima migrare aplicată | `20260513180000_admin_notifications` |
| priceType / salary / sessionVersion / token tables | **absente** (corect pre-PR) |
| `priceAmount` nullability | NOT NULL · 0 null rows |
| Invoice `paymentId` duplicate groups | **0** |
| Unique `invoices_paymentId_key` | **absent** (doar index non-unique) |
| Jobs | 0 |
| Counts | users 35 · listings 48 · payments 56 · invoices 3 · messages 107 |
| Long TX / locks | 0 long · connections 6/100 |
| Replication | primary |

## H–I. Simulare locală (dump read-only din prod)

Dump: `tmp/test-results/faza19/prod-readonly.dump` (sha256 în `prod-dump.sha256`).

| Run | Restore | migrate deploy | Counts | FIXED backfill | salary inventat | unique invoice | token tables | App health |
|-----|---------|----------------|--------|----------------|-----------------|----------------|--------------|------------|
| 1 | PASS | PASS (5 migrări) | păstrate | 48 FIXED | 0 | OK | OK | — |
| 2 | PASS | PASS | păstrate | 48 FIXED | 0 | OK | OK | health/listings/home/login 200 pe `:3106` |

Restore-verify separat pe DB temporară: users=35, listings=48 → **PASS**.

## J. Riscuri migrări

| Migrare | Operații | Lock | Backfill | Risc pe live |
|---------|----------|------|----------|--------------|
| price/salary | ENUM + ALTER nullable + UPDATE FIXED + indexes | ALTER scurt pe 48 rows | non-Job amount>0 → FIXED | scăzut |
| invoice unique | CREATE UNIQUE INDEX | scurt; 0 dups | nu | scăzut |
| sessionVersion | ADD COLUMN DEFAULT 0 | scurt | default | scăzut |
| refresh tokens | CREATE TABLE + FK | scurt | nu | scăzut |
| email tokens | CREATE TABLE + FK | scurt | nu | scăzut |

Durată: **neconfirmată pe live**; pe sim local &lt;2s pentru toate. Nu inventăm SLA.

## K. Backup / restore plan (FAZA 20 — neexecutat pe server)

Există: `scripts/backup-db.sh`, `scripts/restore-db.sh`, pe server `backups/pre-deploy-20260514-live.sql.gz` (~47K, **vechi**).

**FAZA 20 obligatoriu înainte de migrate:**

```bash
# pe server, în /var/www/clickanunt (după ce env URL-urile sunt corecte)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
./scripts/backup-db.sh "pre-faza20-${STAMP}"
sha256sum "backups/pre-faza20-${STAMP}.sql.gz" | tee "backups/pre-faza20-${STAMP}.sha256"
# restore într-o DB temporară (NU pe autoplat):
sudo -u postgres createdb autoplat_restore_${STAMP}
sudo -u postgres pg_restore -d autoplat_restore_${STAMP} --no-owner --no-acl \
  <(gunzip -c backups/pre-faza20-${STAMP}.sql.gz)   # sau pg_restore -Fc dacă format custom
sudo -u postgres psql -d autoplat_restore_${STAMP} -c 'SELECT count(*) FROM users; SELECT count(*) FROM listings;'
sudo -u postgres dropdb autoplat_restore_${STAMP}
```

Deploy **nu începe** până backup+restore-verify = PASS.

## L. Deploy plan FAZA 20 (fără execuție)

1. Remediere P1 env (URLs) + confirmă absența E2E flags  
2. Strategie dirty tree: nu commita uploads; folosește deploy care nu șterge `public/uploads` / sau stash  
3. Backup + restore-verify  
4. Preflight SQL (dups=0, migrate status)  
5. Fetch SHA `c5435c1c` într-un release dir **sau** checkout pe app dir  
6. `npm ci` · `npx prisma generate` · `npm run build` (build **înainte** de switch dacă există release dir)  
7. `npx prisma migrate deploy` (fereastră scurtă)  
8. `pm2 reload clickanunt --update-env` (nu restart hard dacă posibil)  
9. Health + smoke  
10. Observare

**Ordine migrări vs build:** build-ul `c5435c1c` **necesită** schema expandată (priceAmount nullable). Deci: migrate deploy **înainte** de a porni procesul pe noul build, sau reload atomic imediat după migrate pe același SHA.

## M. Rollback boundary

| Acțiune | Permis? |
|---------|---------|
| App rollback la `ea6904b2` după price/salary migrate | **NU** |
| App rollback la `ed22afed` / `3c924c72` / `c5435c1c` hotfix | **DA** (Prisma compatibil) |
| App rollback la live vechi `a40ccde7` după migrate | **NU** (pre-expand client) |
| Reverse SQL DROP columns în incident | **NU** (expand-only) |

SHA rollback recomandat post-migrate: **`c5435c1c`** (același) sau orice commit ≥ `ed22afed` pe aceeași schemă.

## N–O. Smoke + monitorizare FAZA 20

Read-only imediat: health, `/api/listings`, homepage, detail, robots/sitemap, PM2 online, logs fără Prisma null errors.

Controlat (conturi test): login, search, favorite, draft, edit, moderare, mesaj, phone reveal, upgrade, notificări, admin.

**Stop/rollback dacă:** health≠200 · listings 500 · Prisma mismatch · PM2 restart loop · 5xx spike · auth 401 generalizat · migrate failed · disk/CPU critic · connections → max.

## P. Security (HEAD)

Protecțiile PR rămân (cookie-first, refresh rotation, phone privacy, webhook, amount server-side, cron fail-closed, soft-delete, RBAC). Zero secrete în git. E2E bypass absent pe live.

## Q–R. Defecte

| ID | Sev | Dovadă | Cauză | Impact | Remediere | Stare |
|----|-----|--------|-------|--------|-----------|-------|
| P1-URL | P1 | env shapes localhost | config vechi | URL absolute / auth / Stripe redirect greșite | set https://www.clickanunt.ro | **OPEN — blochează** |
| P1-DIRTY | P1 | `git status` uploads dirty | uploads în tree | git deploy conflict/pierderi | strategie deploy fără touch uploads | **OPEN — blochează** |
| P2-CRON | P2 | CRON_SECRET missing | neconfigurat | cron 503 fail-closed | setează secret | OPEN |
| P2-REDIS | P2 | REDIS_URL missing | neconfigurat | posibil fără Redis app-level | setează dacă e necesar | OPEN |
| P2-BACKUP-AGE | P2 | backup May 2025/14 | ops | restore vechi inutil | backup fresh FAZA 20 | OPEN |
| INFO-CREDIT | INFO | add_credits_balance rolled_back row | istoric | zgomot migrate status | documentat | OK |

## S. Teste locale această fază

- `npm ci` · lint · type-check · unit 738 · prisma validate/generate · build PASS  
- Sim migrate ×2 PASS · app pe sim DB PASS · restore-verify PASS  

## T. Git/PR

Docs commit separat dacă e cazul. Fără merge/deploy. `gh` neautentificat — lipește secțiunea PR manual.

## U. Nivel de risc

| Domeniu | Nivel | De ce |
|---------|-------|-------|
| Migrări DB pe date live | **scăzut–mediu** | 48 rows, 0 dups, sim ×2 OK |
| Deploy app fără fix URL | **ridicat** | localhost în NEXTAUTH/APP/BASE |
| Deploy cu tree dirty | **mediu–ridicat** | conflict git/rsync |
| Global (acum) | **RIDICAT** → BLOCKED |

## V–W

Probleme rămase = P1-URL, P1-DIRTY (+ P2).  
Confirmări: zero mutate pe producție în FAZA 19; zero Stripe LIVE tests; zero migrate live; porturi lab curate.
