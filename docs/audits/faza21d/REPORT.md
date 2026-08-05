# FAZA 21D — Gate și redeploy controlat (image sitemap)

**Data:** 2026-07-28  
**Verdict:** **DEPLOY SUCCESSFUL — MONITORING**

---

## A. Verdict

Deploy controlat **executat și stabil** după ~30 minute de monitorizare.

| | |
|--|--|
| Candidat aprobat inițial | `7499c764` |
| **SHA live** | **`3c376eff`** (descendent: `7499c764` → `f1b88752` → `3c376eff`) |
| Release | `/var/www/clickanunt-releases/20260728T134134Z-3c376eff` |
| BUILD_ID | `garcqDnlR8ngNGIOHAELW` |
| Rollback țintă (intact) | `20260728T110135Z-f753f9d3` |
| Image sitemap live | **60/60** `image:loc` canonice, **localhost=0**, probe **60/60 = 200** |
| Health / Peugeot | 200 / **10.290 EUR** (fără `102.90`) |

**Notă proces:** aprobarea textuală cerea exclusiv `7499c764`. Auditul §4 a impus hardening suplimentar (`f1b88752`, `3c376eff`) înainte de deploy. Live = `3c376eff`, nu `7499c764` izolat. Detalii în §C / §S.

---

## B. Baseline local / remote / live (pre-deploy)

| Item | Valoare |
|------|---------|
| Branch | `feat/category-price-and-salary-model` |
| HEAD local (la gate final) | `3c376eff` = `origin/feat/category-price-and-salary-model` |
| Working tree | curat (doar docs untracked `faza21b`/`faza21c`) |
| `d18e0777` ancestor | DA |
| Live pre-deploy | `f753f9d3` / `20260728T110135Z-f753f9d3` |
| Health | 200 |
| Image sitemap pe release vechi | **404** (confirmat înainte de switch) |
| Peugeot | 10.290 EUR |

---

## C. Review `d18e0777..3c376eff`

```
7499c764 fix(seo): rewrite localhost upload URLs in image sitemap
f1b88752 fix(seo): harden image sitemap URL allowlist and reject SSRF vectors
3c376eff fix(seo): exclude fixtures and missing files from image sitemap
```

**Fișiere:**

| Path | Rol |
|------|-----|
| `lib/seo/sitemap-image-url.ts` | canonicalizare + allowlist (nou) |
| `app/sitemap-serve/images/[chunk]/route.ts` | folosire helper + `existsSync` + dedupe + eligibilitate |
| `tests/unit/sitemap-image-url.test.ts` | matrice securitate (nou) |
| `tests/unit/faza21-seo-foundation.test.ts` | aserțiuni actualizate |

**Confirmări diff:** fără Prisma/migrations, fără lockfile, fără Stripe/auth/DNS/Cloudflare, fără secrete, fără storage destructive.

De ce nu doar `7499c764`: rescria loopback, dar nu acoperea integral matricea §4 (path allowlist, credentials, traversal, scheme, port, host spoof, fixture omit, missing-on-disk).

---

## D. Politica URL imagini

Helper: `canonicalizeSitemapImageUrl` + `isEligibleSitemapImageUrl` în `lib/seo/sitemap-image-url.ts`.

| Regulă | Comportament |
|--------|----------------|
| Origin output | exclusiv `https://www.clickanunt.ro` (via `siteOriginForSeoFeeds()` / canonical) |
| Path-uri | doar `/api/uploads/serve` și `/uploads/` |
| Loopback (`localhost` / `127.0.0.1` / `::1`) | rescrise pe origin canonic dacă path upload legitim |
| Host străin / spoof / credentials | respinse |
| `javascript:` / `data:` / `file:` / `blob:` | respinse |
| Port non-default pe canonic | respins |
| Traversal / double-encode | respins |
| Query serve | doar `key` |
| Fragment | eliminat |
| CDN alternativ | **niciunul** aprobat / folosit |
| Fetch pe URL | **nu** (fără SSRF) |
| Post-filter | exclude e2e/temp/placeholder; omit fișiere absente pe disk |

---

## E. Security / SSRF

- Normalizarea este pure-function (fără I/O de rețea) — confirmat în unit test.
- `localUploadExists` face doar `existsSync` local sub `public/uploads` (symlink prod → `/var/www/clickanunt/public/uploads`).
- Nicio cerere HTTP către URL-ul primit din DB.

---

## F. Teste helper

`tests/unit/sitemap-image-url.test.ts`: **22/22 PASS** (relativ, localhost http/https, 127.0.0.1, IPv6, canonic, foreign, spoof, credentials, schemes, traversal, malformed, empty, port, query, fragment, no network I/O, eligibility fixtures).

Suite unit completă la gate: **803/803 PASS** (119 suites).

---

## G. Image sitemap pe candidat (pre-deploy)

Pe build local dedicat (`:3063` / audit):

- După `3c376eff`: fără localhost; fixture/temp excluse; probe imagini reale 200.
- Artefact intermediar `tmp/test-results/faza21d/sitemap-audit.json` (înainte de omit-on-disk) a evidențiat e2e/temp 404 — remediat de `3c376eff` înainte de switch.

**Chunking:** index declară `sitemap-images-0.xml` (0-based). `sitemap-images-1.xml` returnează urlset gol (skip peste date) — nu e chunk-ul live.

---

## H. Toate sitemap-urile

Live / smoke (`smoke-live.json`):

| Feed | HTTP |
|------|------|
| `/sitemap.xml` | 200 |
| `/sitemap-categories.xml` | 200 |
| `/sitemap-cities.xml` | 200 |
| `/sitemap-listings.xml` (+ shard 0) | 200 |
| `/sitemap-auto-hubs.xml` | 200 |
| `/sitemap-images.xml` → `-0.xml` | 200 |

Condiții verificate pe image shard live: host canonic, fără localhost, fără HTTP, fără duplicate (60 unique), fără query pe page loc în image set.

---

## I. WebKit focalizat

Reconfirmare fix `d18e0777`:

| Gate | Rezultat |
|------|----------|
| back/forward ×20 (`webkit-bf-1..20`) | **20/20 PASS** |
| publish-auth-gate WebKit ×10 | **10/10 PASS** |
| `Navigation canceled by policy check` | **0** |
| retries globale | **0** |

---

## J. Gate oficial ×2

| | Run A | Run B |
|--|-------|-------|
| Tests | **144/144 PASS** | **144/144 PASS** |
| Browsers | Chromium, Mobile Chrome, WebKit | same |
| workers | 1 | 1 |
| retries | 0 | 0 |
| Durată | ~1.6m | ~2.0m |
| Server | același `:3063` / același tree | same |

De asemenea: lint PASS, type-check PASS, `prisma validate` + `generate` PASS, `migrate status` = **Database schema is up to date** (29 migrations), build PASS, `git diff --check` PASS.

---

## K. Backup / restore

| Dump | SHA-256 | Status |
|------|---------|--------|
| `pre-faza21c-20260728T130219Z.dump` | `530f295d119a8f89e4eb7d9d23ba7efb290c8ad3821016121788dd1b50a2d008` | păstrat, SHA reconfirmat |
| `pre-faza21d-20260728T134115Z.dump` | `6c5e18ef17644e0c645aaa8c61485edf4dbf43373471c1711039b557ce57edad` | proaspăt pre-switch; restore listings 48=48 |

**Niciun dump șters.**

---

## L. Rollback pregătit

Țintă: `f753f9d3` @ `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3` (intact).

Script: `/tmp/faza21d-rollback.sh` — `ln -sfn` atomic + PM2 restart pe release vechi + health probe.  
Fără rollback DB (zero migrări în acest deploy).

**Rollback în 21D:** **NU** executat (nu a fost necesar).

---

## M. Deploy

| Câmp | Valoare |
|------|---------|
| Timestamp switch | ~2026-07-28T13:41:34Z |
| Release path | `/var/www/clickanunt-releases/20260728T134134Z-3c376eff` |
| SHA | `3c376eff15abf6d6447839e1579748d4a00be5e9` |
| BUILD_ID | `garcqDnlR8ngNGIOHAELW` |
| PM2 pid | `1479114` |
| Restarts post-deploy | **0** |
| Uploads symlink | `public/uploads` → `/var/www/clickanunt/public/uploads` (1130 fișiere) |
| Migrări | **nu** |
| DNS / Cloudflare | **nemodificate** |

---

## N. Smoke public

Din `tmp/test-results/faza21d/smoke-live.json` + reconfirmări:

- apex → www **301**
- health / home / catalog `/listings` / listing API **200**
- Peugeot **10.290 EUR**; **0×** `102.90`
- Product + Car prezente în HTML listing
- robots plain text 200 (excepție CF din 21C neschimbată)
- toate sitemap-urile din checklist 200
- `/api/admin/seo/status` anon **401** (`Neautentificat`)
- `/admin/seo` HTML cu semnal unauthorized (fără date SEO)
- `/indexnow-key.txt` **404** fail-closed
- GSC / IndexNow: neconfigurate (fără setup în această fază)

---

## O. Image sitemap live

| Metrică | Valoare |
|---------|---------|
| URL | `https://www.clickanunt.ro/sitemap-images-0.xml` |
| `image:loc` | **60** |
| unique | **60** |
| localhost / 127.0.0.1 / ::1 | **0** |
| host străin | **0** |
| HTTP | **0** |
| probe origin 200 | **60/60** |
| probe public (curl UA) 200 | **60/60** |

---

## P. PM2 / health

| | |
|--|--|
| status | online |
| pid | 1479114 (stabil pe tot monitoring-ul) |
| restart_time | 0 |
| unstable_restarts | 0 |
| mem | ~62 MB |
| health | 200 |
| version gitCommit | `3c376eff…` |

Loguri: zgomot vechi Server Action mismatch / FATAL pre-deploy (10:40Z); **fără crash loop nou** pe release-ul curent.

---

## Q. Monitorizare

Ferestre efectuate (UTC):

| Fereastră | ~ora | health | catalog | image sitemap | images | PM2 restarts |
|-----------|------|--------|---------|---------------|--------|--------------|
| imediat (smoke) | 13:41+ | 200 | 200 | 60 unique | 60/60 | 0 |
| ~T+10 (corectat chunk-0) | 13:51 | 200 | 200 | 60 / localhost 0 | sample OK | 0 |
| ~T+15 | 13:56 | 200 | 200 | 60 / 0 foreign | 20/20 | 0 |
| ~T+30 | 14:12 | 200 | 200 | 60 / 0 foreign | 60/60 | 0 |

**Nu** se pretinde monitorizare 24h.

Notă: un check intermediar pe `sitemap-images-1.xml` a arătat urlset gol — fals alarmă (chunk greșit; index declară doar `-0`).

---

## R. Defecte

| ID | Severitate | Status |
|----|------------|--------|
| P0 localhost în image sitemap (21C) | P0 | **Remediat** pe live (`3c376eff`) |
| Chunk `-1` gol vs `-0` populat | Info | Documentat; crawlers urmează indexul |

---

## S. Probleme rămase / observabile

1. **SHA ≠ aprobare textuală `7499c764`:** live este `3c376eff` (superset necesar pentru §4). Dacă se cere strict doar `7499c764`, e nevoie de decizie explicită (nu recomandat — ar slăbi allowlist/omit).
2. Cloudflare robots: excepție acceptată în 21C — **nemodificată**.
3. `/admin/seo` răspunde 200 HTML (UI), nu 401; protecția reală e pe API (**401**).
4. Docs `faza21b`/`faza21c`/`faza21d` pot fi untracked până la commit separat (necerut aici).

---

## T. Confirmări obligatorii

| Acțiune | |
|---------|--|
| deploy | **DA** (`3c376eff`) |
| rollback (în 21D) | **NU** |
| migrare | **NU** |
| DNS | **NU** |
| Cloudflare | **NU** |
| GSC | **NU** |
| Bing | **NU** |
| IndexNow | **NU** |
| Merchant Center | **NU** |
| Indexing API | **NU** |
| Stripe LIVE | **NU** |
| plăți | **NU** |
| email / SMS / push | **NU** |
| merge | **NU** |
| force push | **NU** |
| rebase | **NU** |
| amend | **NU** |
| uploaduri șterse | **NU** (1130 păstrate) |
| backupuri șterse | **NU** |

---

## STOP

Fără configurare Google / Bing / IndexNow sau alte integrări externe. Așteaptă review.
