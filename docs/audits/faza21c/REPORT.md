# FAZA 21C — Închiderea blocărilor și deploy controlat SEO

**Data:** 2026-07-28  
**Verdict:** **ROLLED BACK**

---

## A. Verdict

Deploy pe `d18e0777` a fost **executat**, apoi **rollback** pe `f753f9d3` din cauza P0: image sitemap public conținea `https://localhost:3000/...` (13/77 image:loc).

Live actual: release `20260728T110135Z-f753f9d3`, health 200, Peugeot `10.290 EUR`.  
Remedierea P0 este pe branch la `7499c764` — **nu** redistribuată; așteaptă fază/aprobare nouă.

---

## B. Baseline (21C.0)

| Item | Valoare |
|------|---------|
| Branch | `feat/category-price-and-salary-model` |
| HEAD start | `86819dfe` (= remote) |
| Untracked | `docs/audits/faza21b/` (raport anterior) |
| Live | `f753f9d3` / `20260728T110135Z-f753f9d3` |
| PM2 | online, restarts 0, unstable 0 |
| Health public | 200 |

---

## C. Excepția Cloudflare robots

**CLOUDFLARE ROBOTS DIFFERENCE — ACCEPTED EXCEPTION**

Dovezi (`tmp/test-results/faza21c/robots-exception.json`):

| Criteriu | Rezultat |
|----------|----------|
| HTTP 200 | DA (toate UA) |
| `text/plain` | DA |
| Challenge / HTML | NU |
| Redirect diferit crawleri | NU (același body sha16 `1b5495d56721ab37`) |
| Googlebot Allow `/` | DA (Disallow doar `/api`) |
| Googlebot-Image | nu blocat (moștenește `*`) |
| Bingbot | nu blocat |
| AdsBot-Google | nu blocat |
| GPTBot / AI bots | `Disallow: /` (doar aceștia) |
| Sitemap canonic | `https://www.clickanunt.ro/sitemap.xml` |
| noindex / X-Robots-Tag | absente |
| `/_next` blocat | NU |
| Cloudflare modificat | **NU** |

---

## D. Eșecul WebKit inițial

| | |
|--|--|
| Spec | `tests/e2e/publish-auth-gate.spec.ts` |
| Test | `back/forward after redirect stays on-site login` |
| Linie | ~49 `page.goForward()` |
| Mesaj | `Navigation canceled by policy check` |
| Playwright | 1.58.2 |
| WebKit | 26.0 |

---

## E. Cauza demonstrată

**DEFECT TEST** (orchestrare), nu defect aplicație.

Reproducere fără wait între `goBack`/`goForward`: **0/30 PASS** (fie cancel policy, fie URL rămâne `/`).  
Cu `waitForURL(/)` + `waitForLoadState` după Back: **15/15 PASS**.

WebKit anulează traversări history concurente. Contractul utilizator (Back→Forward pe login on-site) rămâne valid când navigările sunt secvențiale.

---

## F. Remedierea (E2E)

Fișier: `tests/e2e/publish-auth-gate.spec.ts`  
Commit: `d18e0777` — `test: stabilize WebKit history navigation gate`  
Păstrează `goBack`/`goForward`; sincronizează pe URL stabil + load; asertează origin local.

---

## G. Gate focalizat

| Gate | Rezultat |
|------|----------|
| WebKit back/forward ×20 | **20/20 PASS** |
| publish-auth-gate WebKit ×10 | **10/10 PASS** |
| Chromium spec | 6/6 PASS |
| Mobile Chrome spec | 6/6 PASS |
| Health | 200 înainte/după |

---

## H. Gate oficial Run A / Run B

| | Run A | Run B |
|--|-------|-------|
| Tests | **144/144 PASS** | **144/144 PASS** |
| Browsers | Chromium, Mobile Chrome, WebKit | same |
| workers | 1 | 1 |
| retries | 0 | 0 |
| Durată | ~96s | ~95s |
| BUILD_ID | `FkB8FMKARsw-qeD1jEEY_` | same |
| Server PID | 47067 | same |
| Health | 200 | 200 |

Lint / tsc / build / prisma: PASS.  
Unit (env curat, fără `E2E_DISABLE_RATE_LIMIT`): **778/778 PASS**.  
(Notă: o rulare unit contaminată de `E2E_DISABLE_RATE_LIMIT=1` din shell a eșuat pe rate-limit — fals negativ de mediu.)

---

## I. Commit / push

| SHA | Mesaj |
|-----|--------|
| `d18e0777` | test: stabilize WebKit history navigation gate |
| `7499c764` | fix(seo): rewrite localhost upload URLs in image sitemap |

local = remote după push. Fără merge / force / rebase / amend.

---

## J. SHA deployat (temporar)

`d18e0777` — release `/var/www/clickanunt-releases/20260728T130319Z-d18e0777` · BUILD_ID `S85Hp9KFuVoB8E_nZjbPT`  
Apoi **rollback** → live din nou `f753f9d3`.

SHA curent pe branch (post-fix, nedeployat): `7499c764`.

---

## K. Preflight producție

| Check | |
|-------|--|
| Live înainte | `f753f9d3` stabil |
| Migrări pending | 0 (29 up to date) |
| Disk | 25% |
| RAM | ~3GB available |
| Redis | PONG |
| Uploads | 1130 files |
| GSC/Bing/IndexNow env | ABSENT |
| E2E flags prod | ABSENT |
| Canonical URLs | `https://www.clickanunt.ro` |

---

## L. Backup și restore

| | |
|--|--|
| Dump | `/var/www/clickanunt/backups/pre-faza21c-20260728T130219Z.dump` |
| SHA-256 | `530f295d119a8f89e4eb7d9d23ba7efb290c8ad3821016121788dd1b50a2d008` |
| Size | 352931 bytes |
| Restore temp DB | `autoplat_faza21c_restore_20260728T130219Z` |
| Counts match | **true** (users 35, listings 48, payments 56, invoices 3, …) |
| Peugeot | `active\|10290\|FIXED` live = restore |
| Temp DB | **ștearsă**; dump **păstrat** |
| Notă | tabela `listing_images` nu există (photos JSON pe `listings`) |

---

## M. Rollback pregătit / activat

| | |
|--|--|
| Țintă | `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3` |
| Metodă | `ln -sfn` + `pm2 delete` + `pm2 start` |
| DB rollback | **NU** (fără migrare) |
| Release defect | **păstrat** pe disc (`…-d18e0777`) |

---

## N. Deploy (apoi rollback)

| | |
|--|--|
| Switch start | `2026-07-28T13:05:47Z` |
| Switch end | `2026-07-28T13:05:50Z` (~3s) |
| Health după switch | 200 |
| PM2 | online pid 1477632, restarts 0 |
| Uploads | 1130 neschimbate |
| Rollback | `2026-07-28T13:07:43Z` → `13:07:47Z` |
| Live după rollback | `f753f9d3`, BUILD `1Ri2bwvg3Ox6S9WWAv5mf`, pid 1477876 |

---

## O. Smoke public (în fereastra pe `d18e0777`)

PASS: apex→www, health, homepage, catalog, listings API, Peugeot `10.290 EUR`, Product+Car, `/auto`, q noindex, paginare, 404, robots plain, toate sitemap-urile incl. image index, API SEO 401, indexnow 404.

**FAIL P0:** 13× `image:loc` = `https://localhost:3000/api/uploads/serve?...`

După rollback: image sitemap 404 (așteptat pe `f753f9d3`); health/home/Peugeot OK.

---

## P. Sitemap / image sitemap

| | |
|--|--|
| Cauză P0 | `listing.photos` conține URL absolute localhost; handlerul accepta orice `https:` fără verificare host |
| Impact | sitemap invalid pentru Google Image |
| Fix (nedeployat) | `lib/seo/sitemap-image-url.ts` + route; teste unit |

---

## Q. GSC / IndexNow fail-closed

API SEO anon **401**; `/indexnow-key.txt` **404**; fără credențiale pe server.  
**IMPLEMENTAT, NECONFIGURAT** (pe candidatul deployat scurt; pe live actual lipsește până la redeploy).

---

## R. PM2 și health (după rollback)

online · pid 1477876 · restarts 0 · unstable 0 · cwd `…-f753f9d3` · health 200

---

## S. Monitorizare

| Fereastră | Observație |
|-----------|------------|
| Imediat post-deploy | health 200; P0 image sitemap descoperit |
| Imediat post-rollback | health/home 200; image sitemap 404; Peugeot OK |
| 5 / 15 / 30 min | **neefectuate** ca fereastră lungă (rollback rapid) |

---

## T. Defecte

| ID | Sev | Dovadă | Cauză | Impact | Remediere | Stare |
|----|-----|--------|-------|--------|-----------|-------|
| IMG-SITEMAP-LOCALHOST | **P0** | 13/77 image:loc localhost pe live `d18e0777` | lipsa allowlist host în image sitemap | sitemap invalid | `7499c764` + rollback | FIX pe branch; **live pe f753f9d3** |
| E2E-WEBKIT-HISTORY | P2 | goForward policy check | sync test | gate 21B | `d18e0777` | REZOLVAT |

---

## U. Probleme rămase

- Redeploy SEO foundation **după** gate pe `7499c764` (sau SHA ulterior) — necesită aprobare/fază nouă  
- Unele `listing.photos` în DB încă stochează localhost (date vechi); helperul rescrie la emitere sitemap  
- Smoke autentificat: NECONFIRMAT  
- GSC/Bing/IndexNow: neconfigurate (intenționat)

---

## V. Confirmări

| Acțiune | |
|---------|--|
| deploy | **DA** (temporar `d18e0777`), apoi **ROLLBACK** |
| migrare | NU |
| DNS | NU |
| Cloudflare modificat | NU |
| GSC / Bing / IndexNow / Merchant / Indexing API | NU |
| Stripe LIVE / plăți | NU |
| email/SMS/push | NU |
| merge / force / rebase / amend | NU |
| uploaduri șterse | NU |
| backupuri șterse | NU (dump 21C păstrat) |

---

**STOP pentru review.** Nu continua cu configurarea Google/Bing. Următorul pas recomandat: gate + deploy controlat pe `7499c764` (sau SHA care îl include).
