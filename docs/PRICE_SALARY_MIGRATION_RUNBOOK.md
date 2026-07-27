# Runbook — migrare expand `listing_price_type_and_salary`

**Migrare:** `prisma/migrations/20260726230000_listing_price_type_and_salary/`
**Tip:** expand-only (enum-uri noi + coloane nullable + backfill FIXED pentru non-Job cu amount > 0).
**Acest document nu execută staging/producție.** Comenzile sunt din repository; nu include secrete.

Checkpoint aplicație compatibil dual-read: SHA aprobat pe branch-ul de release (ex. după merge `feat/category-price-and-salary-model`).

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

- [ ] Commit/SHA aprobat pentru release
- [ ] Backup DB confirmat (snapshot / `pg_dump`)
- [ ] Working tree curat pe mașina de deploy
- [ ] `prisma validate` OK
- [ ] `prisma migrate status` înțeles (pending vs applied)
- [ ] Capacitate rollback aplicație: artefact/SHA anterior dual-read disponibil
- [ ] Spațiu disc + lock risk acceptabile (fereastră scurtă ALTER)

---

## Staging (ordine)

1. Backup staging
2. Expand migration: `npx prisma migrate deploy`
3. `npx prisma generate`
4. `npm run build`
5. Deploy build dual-read/dual-write (aplicația care scrie `priceType` / salary)
6. Health: `curl -sf "$STAGING_URL/api/health"`
7. Smoke manual create/edit FIXED + FREE + Job salary
8. E2E local împotriva staging **doar** dacă există mediu dedicat + `E2E_DISABLE_RATE_LIMIT=1`
9. Integrity queries (read-only) — vezi mai jos
10. Observare erori 4xx/5xx pe `/api/listings` POST/PATCH

---

## Producție (ordine — nu rula din acest prompt)

1. Fereastră aprobată
2. Backup verificat
3. `npx prisma migrate status`
4. Expand: `npx prisma migrate deploy`
5. Deploy **exact** SHA aprobat
6. Health local + public (`/api/health`, homepage)
7. PM2/process status (`pm2 status` / `pm2 describe`)
8. Logs scurte post-deploy
9. Integrity queries read-only
10. Monitorizare trafic legacy (listings fără `priceType` încă pe Job-uri)

---

## Rollback

- Rollback **aplicație** la SHA dual-read anterior (coloanele nullable rămân).
- **Nu** DROP enum/columns în incident.
- Backfill separat dacă e nevoie (nu în rollback de urgență).
- Stop dacă: rate mare 500 pe create/edit, migrate eșuat, backup invalid.

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

```bash
npm run build
# alege PORT liber ≠ 3000; nu opri alte servere
PORT=3055 E2E_DISABLE_RATE_LIMIT=1 STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 \
  NODE_ENV=production npx next start -H 127.0.0.1 -p 3055
# alt terminal:
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3055 \
  npx playwright test tests/e2e/price-salary-model.spec.ts \
  tests/e2e/price-salary-patch.spec.ts \
  tests/e2e/business-upgrade-path.spec.ts \
  tests/e2e/publish-auth-gate.spec.ts \
  tests/e2e/publish-wizard-smoke.spec.ts \
  --project=chromium --project="Mobile Chrome" --project=webkit
# Oprește doar PID-ul pornit pentru suită (nu killall).
```

`E2E_DISABLE_RATE_LIMIT=1` dezactivează și cota zilnică de publish (`lib/listing-publish-quota.ts`), nu doar IP rate limit.
