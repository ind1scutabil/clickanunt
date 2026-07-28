# FAZA 20B — Post-deploy verification + price metadata / specs hotfix

**Date:** 2026-07-28 (UTC)  
**Previous live:** `c984a8c99d70f4f211507c3c400dd68448968319`  
**Hotfix live:** `f753f9d3287e35e00a4a7670465578b14519d4ad`  
**Release:** `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3` · BUILD_ID `1Ri2bwvg3Ox6S9WWAv5mf`

## A. Verdict

**HOTFIX DEPLOYED — MONITORING**

Titlul Peugeot live = `10.290 EUR` (0× `102.90`). Atributele Auto EN duplicate eliminate. Fără migrare / fără modificare DB.

## B. Cauza metadata

La momentul verificării FAZA 20B pe `c984a8c9`, title/OG/Twitter/JSON-LD foloseau deja `formatListingCommercialOrSalaryLine` pe **unități majore** → `10.290 EUR`.  
Defectul raportat `102.90 EUR` (= `10290/100`) **nu era prezent** în HTML-ul live actual (0 apariții). Posibil cache SERP/share sau observație pe un path vechi.

Hotfix-ul unifică totuși SEO pe `formatListingPublicPriceLine` + teste de paritate care blochează regresia `/100`.

## C. Unitatea priceAmount

| Surse | Unitate |
|-------|---------|
| Prisma `Int?` | major units (nu bani/cenți) |
| DB Peugeot | `10290` EUR FIXED |
| Formatter canonic | `Intl` `ro-RO` fără `/100` → `10.290 EUR` |
| Card / detail / metadata / OG | același helper |
| JSON-LD `Offer.price` | `10290` (numeric major) |
| Stripe amounts | bani — **alt domeniu** (invoices/promotions) |

## D. Matricea prețurilor (unit tests)

FIXED RON/EUR, NEGOTIABLE, FROM, FREE, ON_REQUEST, Job exact/interval/legacy — display + JSON-LD coerente; FREE/ON_REQUEST fără preț inventat în Offer.

## E. Atribute duplicate

**Cauză reală:** chei EN din `attributes` (`condition`, `horsepower`, `cylinderCapacity`, `registrationDate`, `accidents`) cădeau în `appendGenericAttributes` → label-uri `Condition` / `Horsepower` / … lângă `Stare` / (lipsă Putere).

**Fix:** mapare RO + mark used + `excludeAutoKeys` pe Auto; `sedan` → `Berlina`.

Live după hotfix: 0× EN leftovers; `Caroserie=Berlina`, `Accidente=Nu`, `Putere=120`.

(2× pe label = mobile SSR + desktop CSR, unul ascuns CSS — așteptat.)

## F. Copy română/engleză homepage

Textele EN listate (`Trending now`, …) **nu apar** în HTML live; shelves folosesc deja RO (`Anunțuri recente`, `Anunțuri promovate`, …). **Nicio schimbare de copy.**

## G. Smoke autentificat

**NECONFIRMAT** — fără conturi test autorizate în env.

## H. Fix

- `formatListingPublicPriceLine` + layout/OG
- `listing-category-specs` dedupe/mapare Auto
- `HomeDiscoverShelf` transmite `priceType`
- teste unit + e2e parity

## I. Teste

Local gates: lint, type-check, unit, prisma validate/generate, build, `git diff --check` — PASS.  
E2E `listing-price-metadata-parity` · Chromium / Mobile Chrome / WebKit vs live — **3 passed**.

## J. Commit

`f753f9d3` — `fix: align listing metadata with canonical price display`  
Push normal, fără amend/rebase/force/merge.

## K. Release

`/var/www/clickanunt-releases/20260728T110135Z-f753f9d3`  
Previous păstrat: `…/20260728T103328Z-c984a8c9`  
Fără `prisma migrate`. Uploads 1130 neschimbate. Backup FAZA 20 păstrat.

## L. Verificare live

| Check | Rezultat |
|-------|----------|
| Title / OG / Twitter | `10.290 EUR` |
| `102.90` | 0 |
| Offer.price | 10290 EUR |
| Specs EN | 0 |
| Imagine sample | 200 |

## M. PM2 / health

online · pid 1474050 · restarts 0 · unstable 0 · health/listings 200

## N. Probleme rămase

- Smoke autentificat NECONFIRMAT
- Cache terțe (Google/Facebook) pot arăta preview vechi până la re-crawl
- Shell admin HTML 200 anon (preexistent; API 401)

## O. Confirmări

fără modificare DB · fără migrare · fără uploaduri/backupuri șterse · fără plăți · fără force/rebase/amend/merge
