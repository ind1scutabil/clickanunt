# Runbook — migrare expand `listing_price_type_and_salary`

**Migrare:** `prisma/migrations/20260726230000_listing_price_type_and_salary/`
**Tip:** expand-only (enum-uri noi + coloane nullable + backfill FIXED pentru non-Job cu amount > 0).
**Acest document nu execută staging/producție.** Comenzile sunt din repository; nu include secrete.

**Aplicație compatibilă cu schema expandată:** SHA-ul care include modelul price/salary (ex. `ed22afed` sau ulterior pe același branch).

---

## Preflight (local / staging / producție — fără migrate pe prod din acest prompt)

```bash
git rev-parse HEAD
git status --short          # branch curat la deploy
npx prisma validate
npx prisma migrate status   # pe DB-ul țintă (local aici)
df -h .
# Conexiuni DB (local):
# psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database();"
```

Checklist:

- [ ] Commit/SHA aprobat pentru release (build care acceptă `priceAmount` null)
- [ ] Backup DB confirmat (snapshot / `pg_dump`)
- [ ] Working tree curat pe mașina de deploy
- [ ] `prisma validate` OK
- [ ] `prisma migrate status` înțeles (pending vs applied)
- [ ] Capacitate rollback aplicație: **nu** `ea6904b2` după migrate — vezi secțiunea Rollback
- [ ] Spațiu disc + lock risk acceptabile (fereastră scurtă ALTER)
- [ ] `E2E_DISABLE_RATE_LIMIT` / `CLICKANUNT_E2E_SERVER` **absente** din env PM2/staging/prod

---

## Staging (ordine)

1. Backup staging
2. Expand migration: `npx prisma migrate deploy`
3. `npx prisma generate`
4. `npm run build`
5. Deploy build care scrie/citește `priceType` / salary (SHA ≥ model price/salary)
6. Health: `curl -sf "$STAGING_URL/api/health"`
7. Smoke: listă publică, detail, create/edit FIXED + FREE + Job salary
8. E2E împotriva staging **doar** pe mediu dedicat local/proxy; **nu** seta `E2E_DISABLE_RATE_LIMIT` sau `CLICKANUNT_E2E_SERVER` pe procesul staging
9. Integrity queries (read-only) — vezi mai jos
10. Observare erori 4xx/5xx pe `/api/listings` GET/POST/PATCH

---

## Producție (ordine — nu rula din acest prompt)

1. Fereastră aprobată
2. Backup verificat
3. `npx prisma migrate status`
4. Expand: `npx prisma migrate deploy`
5. Deploy **exact** SHA aprobat (compatibil null `priceAmount`)
6. Health local + public (`/api/health`, homepage, `/api/listings`)
7. PM2/process status (`pm2 status` / `pm2 describe`)
8. Logs scurte post-deploy
9. Integrity queries read-only
10. Monitorizare trafic legacy (Job-uri fără salary structurat)

---

## Rollback — strategie reală (demonstrată)

### INCOMPATIBIL: `ea6904b2` după expand

Checkpointul `ea6904b2` are Prisma `priceAmount Int` (non-null). După migrare, rândurile FREE/ON_REQUEST/Job fără amount au `priceAmount = null`. Clientul vechi eșuează la `findMany` cu:

`Error converting field "priceAmount" of expected non-nullable type "Int", found incompatible value of "null".`

Dovadă locală: proces `next-server` pornit înainte de migrare pe `:3000` → homepage 200, `GET /api/listings` 500 cu mesajul de mai sus; DB locală conține zeci de rânduri cu `priceAmount` null.

**Nu** face rollback aplicație la `ea6904b2` (sau orice build pre-expand) după `migrate deploy`.

### Compatibil

1. Rollback aplicație la un SHA **≥** modelul price/salary (ex. `ed22afed` sau hotfix ulterior pe aceeași schemă).
2. Coloanele/enumurile nullable **rămân** (expand-only); **nu** DROP în incident.
3. Dacă trebuie oprit write pe câmpuri noi: deploy hotfix care ignore/reject salary/priceType noi, dar tot cu client Prisma care acceptă `Int?`.
4. Feature flag opțional pentru UI salary (nu înlocuiește clientul Prisma).
5. Backfill separat doar dacă e necesar operațional — nu în rollback de urgență.

Stop dacă: rate mare 500 pe GET listings, migrate eșuat, backup invalid, sau s-a desfășurat accidental un build pre-expand pe DB expandată.

---

## Integrity queries (read-only — **nu pe producție din acest prompt**)

```sql
-- Distribuție priceType
SELECT "priceType", count(*) FROM listings WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY 2 DESC;

-- non-Job amount > 0 cu priceType null
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category <> 'Locuri de muncă'
  AND "priceAmount" IS NOT NULL AND "priceAmount" > 0 AND "priceType" IS NULL;

-- FREE/ON_REQUEST cu amount nenul
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND "priceType" IN ('FREE','ON_REQUEST')
  AND "priceAmount" IS NOT NULL;

-- tipuri cu sumă dar amount null (FIXED/FROM/NEGOTIABLE)
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND "priceType" IN ('FIXED','FROM','NEGOTIABLE')
  AND ("priceAmount" IS NULL OR "priceAmount" <= 0);

-- Jobs cu salary incomplet (min/max fără period sau currency)
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category = 'Locuri de muncă'
  AND (("salaryMin" IS NOT NULL OR "salaryMax" IS NOT NULL)
       AND ("salaryPeriod" IS NULL OR "salaryCurrency" IS NULL OR btrim("salaryCurrency") = ''));

-- Jobs min > max
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category = 'Locuri de muncă'
  AND "salaryMin" IS NOT NULL AND "salaryMax" IS NOT NULL AND "salaryMin" > "salaryMax";

-- salary pe non-Job
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category <> 'Locuri de muncă'
  AND ("salaryMin" IS NOT NULL OR "salaryMax" IS NOT NULL OR "salaryPeriod" IS NOT NULL);

-- Job legacy amount (priceAmount set, salary null)
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category = 'Locuri de muncă'
  AND "priceAmount" IS NOT NULL
  AND "salaryMin" IS NULL AND "salaryMax" IS NULL;

-- currency/period lipsă pe salary structurat
SELECT count(*) FROM listings
WHERE "deletedAt" IS NULL AND category = 'Locuri de muncă'
  AND ("salaryMin" IS NOT NULL OR "salaryMax" IS NOT NULL)
  AND ("salaryCurrency" IS NULL OR "salaryPeriod" IS NULL);
```

---

## E2E gate local (prod build, port dedicat)

Preferă scriptul:

```bash
npm run build
./scripts/e2e-gate-prod-server.sh 3055
```

Manual (ambele flag-uri obligatorii când `NODE_ENV=production`):

```bash
PORT=3055 E2E_DISABLE_RATE_LIMIT=1 CLICKANUNT_E2E_SERVER=1 \
  STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 NODE_ENV=production \
  npx next start -H 127.0.0.1 -p 3055
```

Bypass cotă/rate-limit (`lib/e2e-rate-limit-bypass.ts`):

- necesită `E2E_DISABLE_RATE_LIMIT=1`;
- dacă `NODE_ENV=production`, necesită **și** `CLICKANUNT_E2E_SERVER=1`;
- nu e controlabil din request/header/cookie/query;
- **interzis** pe staging/producție PM2 (`ecosystem.config.js` nu le definește).

Cleanup: scriptul oprește doar PID-ul care ascultă pe portul ales și a cărui comandă conține `next-server`.
