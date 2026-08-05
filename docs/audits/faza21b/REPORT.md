# FAZA 21B — Review final și deploy controlat al fundației SEO

**Data:** 2026-07-28  
**Verdict:** **BLOCKED**  
**Deploy executat:** NU

---

## A. Verdict

Deploy-ul pe `86819dfe` **nu a fost executat**.

Blocaje absolute confirmate pe dovezi:

1. **Cloudflare robots.txt** — body-ul public ≠ body origin (wrapper Content-Signals). Conform FAZA 21B.4: STOP înainte de deploy; remediere CF necesită aprobare explicită.
2. **Gate E2E oficial** — nu există două rulări consecutive 100% verzi pe același build. Run A = 144/144 PASS; Run B = 143/144 FAIL (WebKit `publish-auth-gate` `goForward` — `Navigation canceled by policy check`). Conform regulii: gate E2E nestabil → STOP.

Toate celelalte gate-uri locale de calitate (lint / type-check / unit / prisma / build) au trecut pe SHA `86819dfe`.

---

## B. SHA local / remote / live

| Item | Valoare | Dovadă |
|------|---------|--------|
| Branch | `feat/category-price-and-salary-model` | `git branch --show-current` |
| HEAD local | `86819dfe940aa39424985c412c3c7d016af0f6d5` | `git rev-parse HEAD` |
| HEAD remote | `86819dfe940aa39424985c412c3c7d016af0f6d5` | `git rev-parse origin/feat/category-price-and-salary-model` |
| local = remote | DA | egalitate SHA |
| Working tree | curat | `git status --short` gol |
| Commit FAZA 21 | `86819dfe` — *feat: add SEO discovery foundation for Google and Bing readiness* | `git log` |
| Raport FAZA 21 | `docs/audits/faza21/REPORT.md` | prezent |
| Live release | `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3` | symlink + PM2 cwd |
| Live SHA | `f753f9d3` (prefix release dir) | CONFIRMAT |
| Live BUILD_ID | `1Ri2bwvg3Ox6S9WWAv5mf` | `.next/BUILD_ID` pe release |
| PM2 | online, pid `1474050`, restarts `0`, unstable `0` | `pm2 jlist` |
| Health local prod | 200 | `http://127.0.0.1:3000/api/health` |

---

## C. Review diff (`f753f9d3..86819dfe`)

| Metrică | Valoare |
|---------|---------|
| Commits | 2: `7ba3aa95` (docs 20B) + `86819dfe` (SEO foundation) |
| Fișiere | **32** |
| Diff | +1878 / −14 |
| `package.json` / lockfile | **NU** |
| Prisma schema | **NU** |
| Migrări noi | **NU** |
| Stripe / payments / promote | **NU** |
| Auth core | **NU** (doar gate admin pe API SEO) |
| Upload / storage | **NU** |
| Secrete în diff | **NU** (doar nume env `INDEXNOW_KEY` în docs/cod/teste) |
| localhost URLs în cod produs | **NU** (canonical `www.clickanunt.ro`) |
| E2E flags în prod code path | fail-closed fără chei; fără auto-submit GSC |
| Date demo în dashboard SEO | **NU** — status `NOT_CONFIGURED` / `not_configured` |
| Request-uri externe automate fără config | **NU** (IndexNow/GSC return early) |

### Clasificare pe straturi (32 fișiere)

| Strat | Fișiere (rezumat) |
|-------|-------------------|
| SEO / hub | `lib/seo/*` (hub-index, status, share, GA4 events, jsonld gate, site-url-guard) |
| sitemap | `app/sitemap-serve/images-*`, rewrites `next.config.ts`, robots |
| robots | `app/robots.ts` (+ image sitemap) |
| admin | `app/admin/seo/page.tsx`, link dashboard |
| API | `app/api/admin/seo/status`, `search-console`, `indexnow-key.txt` |
| analytics | `lib/seo/marketplace-ga4-events.ts` |
| IndexNow | `lib/seo/indexnow-client.ts` |
| share | `lib/seo/share-url.ts` |
| documentation | `docs/audits/faza21/*` |
| tests | unit SEO / IndexNow / GSC / hub-index |
| dependencies | — |
| environment | — (doar documentare nume env) |
| Prisma | — |
| authz | `requireAdminApiPermission` + `ANALYTICS_VIEW` |
| payments/Stripe | — |
| unrelated | docs FAZA 20B |

`git diff --check f753f9d3..86819dfe`: trailing whitespace **doar în docs** (P3) — nu reparabil fără SHA nou.

---

## D. Securitate

| Control | Rezultat | Clasificare |
|---------|----------|-------------|
| `/admin/seo` UI fără sesiune | shell HTML 200 + `noindex`; `useAdminAuth` → `null` fără date; API nechemat | CONFIRMAT PRIN TEST |
| `/api/admin/seo/status` anon | **401**, fără env/secrete în body | CONFIRMAT PRIN TEST |
| `/api/admin/seo/search-console` anon | **401** | CONFIRMAT PRIN TEST |
| GSC adapter fără credențiale | `not_configured`, fără auth Google | CONFIRMAT ÎN COD + TEST |
| IndexNow fără cheie | `/indexnow-key.txt` **404** text, fără placeholder | CONFIRMAT PRIN TEST |
| IndexNow allowlist host canonic | `filterIndexNowUrls` https + host + block admin/dashboard/auth/api | CONFIRMAT ÎN COD |
| SSRF / localhost IndexNow | respinse de filter | CONFIRMAT ÎN COD |
| Share URL fără telefon/email/token | `share-url.ts` + UTM | CONFIRMAT ÎN COD |
| GA4 fără PII | catalog events; strip policy | CONFIRMAT ÎN COD |
| Sitemap fără private | 0 URL admin/dashboard/messages/favorites în eșantion | CONFIRMAT PRIN TEST |
| Image sitemap fără private pages | 0 | CONFIRMAT PRIN TEST |

**P0 secret leak / admin bypass:** nu găsit.

---

## E. Cloudflare / robots.txt

### Public (prin Cloudflare) — UA: browser / Googlebot / Bingbot / curl

| Câmp | Observat |
|------|----------|
| HTTP | **200** |
| Content-Type | `text/plain` |
| Challenge / HTML CF | **NU** |
| Diferență per UA care blochează Googlebot | **NU** (același body) |
| Sitemap canonic | `https://www.clickanunt.ro/sitemap.xml` (+ alte sitemaps origin) |
| localhost | **NU** |
| Allow `/` pentru `*` și Googlebot | **DA** |

### Origin (127.0.0.1:3000 live process)

Body Next.js: `Allow: /`, `Disallow: /api`, `Host: www.clickanunt.ro`, lista sitemap-uri (fără image pe live actual; candidatul local adaugă `sitemap-images.xml`).

### Diferență body

| | Public CF | Origin |
|--|-----------|--------|
| sha/len | ~2250 bytes | ~414 bytes (live) / 468 (candidat local) |
| Extra | Content-Signals preamble + Disallow AI bots (GPTBot, etc.) | — |
| Păstrat | Regulile origin pentru `*` / Googlebot + Host + Sitemap | — |

**Cauză:** Cloudflare Managed Content / Content-Signals overlay pe `/robots.txt` (preexistent pe live `f753f9d3`, nu introdus de FAZA 21).

**Condiție FAZA 21B.4:** body **nu** este identic → **STOP înainte de deploy**; **nu** s-a modificat Cloudflare.

### Remediere propusă (necesită aprobare)

1. În Cloudflare: dezactivare Managed Content / Content-Signals pe `robots.txt` **sau**
2. Reguli care lasă pass-through origin pentru `/robots.txt` fără prepend,
3. Re-verificare: body public == body origin; apoi re-aprobare deploy.

Până atunci: clasificare **CONFIGURATION REQUIRED** (Cloudflare), crawl Googlebot rămâne permis (`Allow: /` + sitemaps).

---

## F. Sitemap (candidat `86819dfe` pe `127.0.0.1:3061`)

BUILD local: `AE91PBhkOPaVxtAG6oVB8`

| Endpoint | HTTP | Content-Type | Note |
|----------|------|--------------|------|
| `/sitemap.xml` | 200 | `application/xml` | 15 URL static; host `www.clickanunt.ro` |
| `/sitemap-categories.xml` | 200 | `application/xml; charset=utf-8` | 15 categorii; eșantion 200 |
| `/sitemap-cities.xml` | 200 | xml | urlset gol (sub prag) |
| `/sitemap-listings.xml` | 200 | xml | index → `sitemap-listings-0.xml` (458) |
| `/sitemap-auto-hubs.xml` | 200 | xml | gol (sub prag) — așteptat |
| `/sitemap-images.xml` | 200 | xml | index → `sitemap-images-0.xml` (458 page locs) |
| Listing sample 20 | 200 | — | fără private |
| Static toate | 200 | — | fără private |
| Private / query / localhost în locs | 0 | — | PASS |

**Notă imagini locale:** `image:loc` pointează la `https://www.clickanunt.ro/api/uploads/serve?key=listings/e2e/...` — pe DB locală e2e fixtures; GET local pe path fără key valid → 404. Nu e regresia live pe uploads reale (1130 pe VPS). După deploy, validarea publică pe imagini reale rămâne obligatorie.

Live actual **nu** are încă `/sitemap-images.xml` (404) — așteptat pre-deploy FAZA 21.

---

## G. Search Console

| Check | Rezultat |
|-------|----------|
| Config pe server | NOT_CONFIGURED (fără credențiale) |
| Endpoint admin fără auth | 401 |
| Date inventate | NU |
| 500 | NU |
| Expunere env | NU |
| Auth Google automată | NU |
| Impact homepage/catalog | NU |

**Clasificare:** **IMPLEMENTAT, NECONFIGURAT**

---

## H. IndexNow

| Check | Rezultat |
|-------|----------|
| `INDEXNOW_KEY` | neconfigurat (nu setat în această fază) |
| `/indexnow-key.txt` | 404, fără placeholder |
| Submit fără cheie | `not_configured` |
| Bundle secret | NU |

**Clasificare:** **IMPLEMENTAT, NECONFIGURAT**

---

## I. GA4 / consent

| Check | Rezultat |
|-------|----------|
| Catalog evenimente | `marketplace-ga4-events.ts` — fără email/telefon/JWT |
| Debug mode prod | `NEXT_PUBLIC_GA4_DEBUG` gated |
| Cookie consent E2E | inclus în suite extinsă (cookie-consent-analytics) — trecut pe Chromium în curated |
| PII înainte de consent | STOP condition — nu observat în cod |

**Clasificare:** **CONFIRMAT ÎN COD** (+ partial E2E); configurare GA ID: **PROVIDER NECONFIGURAT** dacă lipsește pe prod (neschimbat intenționat).

---

## J. Gate local (`86819dfe`)

| Gate | Rezultat |
|------|----------|
| `npm run lint` | PASS |
| `npm run type-check` | PASS |
| `npm test -- tests/unit` | PASS |
| SEO unit subset (26) | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx prisma migrate status` | up to date, **29** migrations, **0 pending noi** |
| `npm run build` | PASS |
| `git diff --check` (working tree) | PASS |
| E2E oficial A (workers=1, 3 browsere) | **144 passed** |
| E2E oficial B (imediat după, același build) | **143 passed / 1 failed** (WebKit back/forward) |
| Health :3061 before/mid/after A | 200 |

**E2E 2× consecutive verde:** **EȘEC** → STOP.

Defect E2E (nu regresia SEO):

| ID | Sev | Dovadă | Cauză | Impact | Remediere | Stare |
|----|-----|--------|-------|--------|-----------|-------|
| E2E-21B-01 | P2 | `e2e-official-B.log`: `page.goForward: Navigation canceled by policy check` | flake WebKit history pe `/auth/login` | gate 2× eșuat | stabilizare test / expect policy; nu e change FAZA 21 | DESCHIS |
| E2E-21B-02 | P3 | Mobile Chrome `predeploy-ui-smoke` search/login strict mode | locators mobile (2× email; search ascuns) | nu e în suite oficială | fix selectors | DESCHIS |
| E2E-21B-03 | P3 | `listing-price-metadata-parity` local | Peugeot ID absent din DB local („Anunț indisponibil”); **live** title `10.290 EUR` OK | test data local | seed sau skip local | DESCHIS |

---

## K. Backup și restore

**Neexecutat** — STOP înainte de deploy (CF + E2E). Nu s-a creat dump nou; backup-uri existente **nu** au fost șterse.

---

## L. Rollback (pregătit, neactivat)

| Item | Valoare |
|------|---------|
| Release anterior | `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3` |
| SHA | `f753f9d3` |
| Switch | symlink atomic `current` → release anterior + PM2 restart pe cwd nou |
| Trigger | neaplicat (fără deploy) |

---

## M. Deploy

| | |
|--|--|
| Executat | **NU** |
| Release path nou | — |
| Migrări | **NU** |
| Motiv STOP | CF robots body alterat + E2E 2× nestabil |

---

## N. Smoke public post-deploy

**N/A** — fără deploy. Baseline live pre-există pe `f753f9d3` (health/home/listings OK).

Peugeot live: title conține **`10.290 EUR`**, nu `102.90` — **CONFIRMAT LIVE**.

---

## O. PM2 și health (live, neschimbat)

- status online, restarts 0, unstable 0  
- health 200  
- cwd release `…-f753f9d3`

---

## P. Imagini / uploads

- Live uploads (baseline anterior): 1130 fișiere — neschimbate în această fază (fără deploy).  
- Image sitemap pe candidat: implementat; pe live încă absent.

---

## Q. Monitorizare

Fără deploy → fără fereastră post-deploy. Monitorizare 24h: **neefectuată**.

---

## R. Defecte

| ID | Sev | Dovadă | Cauză | Impact | Remediere | Test | Stare |
|----|-----|--------|-------|--------|-----------|------|-------|
| CF-ROBOTS-01 | P2 / gate STOP | body CF ≠ origin; Content-Signals | CF Managed Content | STOP deploy per 21B.4 | aprobare + config CF pass-through | curl public vs origin | DESCHIS |
| E2E-21B-01 | P2 / gate STOP | WebKit goForward policy | flake navigare | E2E 2× fail | stabilizare test | official gate ×2 | DESCHIS |
| DIFF-WS-01 | P3 | `git diff --check` pe range docs | trailing whitespace docs | cosmetic | commit docs separat | diff --check | DESCHIS |

**P0/P1 produs SEO/securitate:** 0 găsite care să fie bug de cod FAZA 21.

---

## S. Remedieri necesare înainte de re-încercare deploy

1. **Aprobare owner** pentru excepție CF robots (accept overlay dacă crawl OK) **sau** schimbare Cloudflare aprobată + re-probe body identic.  
2. **E2E oficial ×2 consecutive PASS** pe build `86819dfe` (sau SHA nou dacă se repară testul flake).  
3. Abia apoi: backup PG + restore-verify + release symlink deploy.

---

## T. Probleme rămase / out of scope

- GSC / Bing verification / IndexNow key / Merchant Center / Indexing API: **neconfigurate** (intenționat).  
- Auto-hubs sitemap gol sub prag: așteptat.  
- Smoke autentificat pe prod: **NECONFIRMAT** (fără cont test autorizat în această sesiune).

---

## U. Git / PR

- Merge: **NU**  
- Force push / rebase / amend: **NU**  
- PR base schimbat: **NU**  
- Commit nou în 21B: **NU** (doar review)

---

## V. Confirmări finale (făcut / nefăcut)

| Acțiune | |
|---------|--|
| deploy | **NU** |
| migrare | **NU** |
| DNS | **NU** |
| configurare Cloudflare | **NU** |
| GSC | **NU** |
| Bing | **NU** |
| IndexNow key | **NU** |
| Merchant Center | **NU** |
| Indexing API | **NU** |
| Stripe LIVE | **NU** |
| plată reală | **NU** |
| email/SMS/push real | **NU** |
| merge | **NU** |
| force push | **NU** |
| rebase | **NU** |
| amend | **NU** |
| ștergere uploaduri | **NU** |
| ștergere backupuri | **NU** |

---

## Clasificări integrări (obligatorii)

| Integrare | Stare |
|-----------|--------|
| Admin SEO UI/API | CONFIRMAT ÎN COD + CONFIRMAT PRIN TEST |
| Search Console | IMPLEMENTAT, NECONFIGURAT |
| IndexNow | IMPLEMENTAT, NECONFIGURAT |
| Image sitemap | CONFIRMAT ÎN COD + CONFIRMAT PRIN TEST (local candidate) |
| Hub indexability helper | CONFIRMAT ÎN COD + CONFIRMAT PRIN TEST |
| GA4 event catalog | CONFIRMAT ÎN COD |
| Share UTM | CONFIRMAT ÎN COD |
| Docs Jobs/Merchant/App Links/feeds | CONFIRMAT ÎN COD |
| Google/Bing verification live | PROVIDER NECONFIGURAT |
| Cloudflare robots pass-through | CONFIGURATION REQUIRED |
| Deploy FAZA 21 | BLOCAT |

---

**STOP pentru review.** Nu se continuă cu configurarea conturilor Google/Bing și nu se activează alte integrări fără aprobare separată.
