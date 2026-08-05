# FAZA 22C — Deploy controlat al fixului de sincronizare count (izolat de `02c86a4b`)

**Data:** 2026-07-29
**Commit deployat:** `6a043975e0686aa4fab43883ec999ce2bf9647af` (cherry-pick al `595d381b` peste live `3c376eff`)
**Branch nou:** `fix/homepage-listing-count-cache`

---

## A. Verdict

**DEPLOY SUCCESSFUL — MONITORING**

Fixul de sincronizare a numărului de anunțuri (homepage cache/invalidare) a fost izolat într-un commit nou minimal (`6a043975`), pornit direct din live-ul de producție (`3c376eff`), **fără** commitul SEO `02c86a4b`. A fost deployat pe un release nou, cu backup + restore verificat înainte, rollback pregătit, smoke complet și monitorizare ~31 minute — totul verde, zero incident, zero rollback necesar.

---

## B. SHA local / remote / live

| Element | Valoare |
|---|---|
| Commit nou | `6a043975e0686aa4fab43883ec999ce2bf9647af` |
| Parent | `3c376eff15abf6d6447839e1579748d4a00be5e9` (identic cu live dinainte de deploy) |
| `02c86a4b` ancestor al noului commit? | **NU** (confirmat `git merge-base --is-ancestor`) |
| Branch nou | `fix/homepage-listing-count-cache` |
| Local (worktree) | `6a043975` |
| Remote (`origin/fix/homepage-listing-count-cache`) | `6a043975` (push normal, fără force) |
| Branch existent `feat/category-price-and-salary-model` | **neatins**, rămâne la `595d381b` |
| Live înainte de deploy | `3c376eff` |
| Live după deploy | `6a043975` |

Diff față de live: **exact 10 fișiere**, 415 inserții / 1 ștergere — identic byte-cu-byte cu diff-ul original al lui `595d381b`:

```
M  app/api/admin/bulk-actions/route.ts
M  app/api/admin/moderation/[id]/approve/route.ts
M  app/api/admin/moderation/[id]/reject/route.ts
M  app/api/listings/[id]/route.ts
M  app/api/listings/route.ts
A  lib/cache/revalidate-marketplace.ts
M  next.config.ts
A  tests/e2e/homepage-catalog-count-lifecycle.spec.ts
A  tests/unit/home-page-stats.test.ts
A  tests/unit/revalidate-marketplace.test.ts
```

Zero fișiere din `02c86a4b` (footer, `/about`, hub-uri, JSON-LD), zero Prisma/migrări (`git diff --stat 3c376eff..6a043975 -- prisma/` — gol), zero FAZA 21E, zero secrete.

---

## C. Baseline count (înainte de deploy, pe live `3c376eff`)

| Sursă | Valoare |
|---|---|
| Homepage SSR | 22 |
| Catalog (`/listings`) | 22 |
| `/api/listings` `pagination.total` | 22 |
| DB canonic (`seoIndexableListingWhere` echivalent SQL) | 22 |

Toate 4 valori identice — confirmă că nu există corupere de date; problema adresată de fix este *fereastra de întârziere* după o mutație (ISR pasiv 5 min + `Cache-Control: max-age=3600` browser), nu o divergență permanentă. Cache-Control live înainte de deploy: `public, max-age=3600, must-revalidate` (bug-ul confirmat activ).

---

## D. Review diff

Verificat explicit — diff-ul conține **exclusiv**:
- helper de invalidare (`lib/cache/revalidate-marketplace.ts`);
- integrări în cele 6 rute de mutație (create, approve, reject, PATCH pause/reactivate, DELETE soft-delete, bulk approve/reject/delete);
- regula Cache-Control dedicată homepage-ului (`next.config.ts`);
- 3 fișiere de test (2 unit + 1 E2E).

Fără Prisma/migrări, fără dependencies noi, fără Stripe/payment, fără auth, fără DNS/Cloudflare, fără credențiale GSC/Bing/IndexNow, fără FAZA 21E, fără secrete.

---

## E. Backup și restore

| Element | Valoare |
|---|---|
| Dump | `/var/www/clickanunt/backups/pre-faza22c-20260729T184059Z.dump` |
| Dimensiune | 355 625 bytes |
| SHA-256 | `9fcbe9871f436eccda877759b2436491f0411763d1f7bebfd0fe54c2208a212f` |
| Restore temp DB | `autoplat_faza22c_restore_20260729T184059Z` |
| Counts verificate | `users` 35=35, `listings` 48=48, `payments` 57=57, `invoices` 3=3, `messages` 107=107, `favorites` 1=1 — **toate identice** |
| Peugeot pe restore | `active\|10290\|FIXED` — identic cu live |
| Count canonic pe restore | 22 — identic cu live |
| Temp DB | **ștearsă** după verificare |
| Dump | **păstrat** pe disc |

---

## F. Rollback pregătit

| Element | Valoare |
|---|---|
| Țintă | `/var/www/clickanunt-releases/20260728T134134Z-3c376eff` (release existent, intact, `node_modules` + `.next` build prezente) |
| Script | `/tmp/faza22c-rollback.sh` pe VPS (`ln -sfn` + `mv -T` atomic + `pm2 delete`/`pm2 start` + health probe) |
| DB rollback | N/A (zero migrări în acest deploy) |
| Verificat structural | da, fără execuție (nu a fost necesar) |
| A fost declanșat? | **NU** |

---

## G. Release deployat

| Element | Valoare |
|---|---|
| Release nou | `/var/www/clickanunt-releases/20260729T184059Z-6a043975` |
| Metodă | `git worktree add --detach` din `/var/www/clickanunt` (sursă comună), la fel ca release-urile anterioare |
| `.env` / `.env.production` | symlink către `/var/www/clickanunt/.env*` (necopiate, nemodificate) |
| `public/uploads` | symlink către `/var/www/clickanunt/public/uploads` (1130 fișiere, 298M — verificat intact înainte și după, nimic șters) |
| `npm ci` | 1187 pachete, `postinstall` → `prisma generate` OK |
| `npm run build` | succes |
| `BUILD_ID` | `SFsbd4ehtQIOs2HHNjiCx` |
| Smoke pre-switch (port temporar 3900) | health/homepage/catalog 200, Cache-Control corect, count 22, zero erori — apoi oprit curat, producția neatinsă în tot acest timp |
| `ecosystem.config.js` | `cwd` actualizat local (necomis) la calea noului release |
| Switch `current` | atomic (`ln -sfn` + `mv -T`), `18:47:50Z` → `18:47:54Z` (~4s) |
| PM2 | `pm2 delete` + `pm2 start ecosystem.config.js`, pid `1541160`, „Ready in 479ms” |
| Health imediat | 200 (local și public) |

---

## H. Cache-Control origin/public

| Moment | Cache-Control |
|---|---|
| Înainte de deploy (live `3c376eff`) | `public, max-age=3600, must-revalidate` |
| După deploy (`6a043975`, verificat T+0, T+5, T+15, T+30min) | `public, max-age=0, must-revalidate` — **constant, pe toată durata monitorizării** |

`CF-Cache-Status: DYNAMIC` (Cloudflare passthrough, neschimbat), `x-nextjs-cache: HIT` (ISR intern Next.js funcțional, servind rapid din cache intern, dar browserul nu mai reține o copie proprie).

---

## I. Count DB / API / homepage / catalog (post-deploy)

| Sursă | Valoare |
|---|---|
| DB canonic (SQL) | 22 |
| `/api/listings` total | 22 |
| Catalog (`/listings`) | 22 |
| Homepage SSR | 22 |

Toate identice, neschimbate față de baseline — deploy-ul nu a alterat datele sau count-ul afișat.

---

## J. Proba de invalidare live

**NECONFIRMATĂ prin mutație reală** — nu a existat un fixture/cont de test explicit autorizat pentru o mutație pe producție în această fereastră, conform regulilor absolute. Acceptarea fixului se bazează pe:
- testele E2E locale de lifecycle (create → approve → +1, pause → −1, soft-delete), rulate de 2 ori consecutiv pe Chromium/Mobile Chrome/WebKit, toate verzi (raportate în FAZA 22B/22C anterior);
- verificarea structurală a codului (toate cele 9 puncte de invalidare apelate strict după succes DB);
- smoke-ul pe portul temporar 3900 înainte de switch, care a confirmat comportamentul build-ului fără a muta date reale.

Nu s-a creat, modificat sau șters niciun anunț real al utilizatorilor.

---

## K. Sitemap și imagini

| Verificare | Rezultat |
|---|---|
| `sitemap.xml` | 200 |
| `sitemap-serve/listings-index` | 200 |
| `sitemap-serve/images-index` | 200 |
| `sitemap-images-0.xml` | 200, 110 `image:loc` (identic cu pre-deploy) |
| `localhost` în image sitemap | 0 |
| Probe imagini (5 eșantion) | toate 200 |

---

## L. PM2 și health

| Moment | Status | Restarts | Uptime |
|---|---|---|---|
| T+0 | online | 0 | 136s |
| T+~7min | online | 0 | 538s |
| T+~14min | online | 0 | 836s |
| T+~23min | online | 0 | 1400s |
| T+~31min (final) | online | 0 | 1877s |

Zero restarturi pe toată durata monitorizării. `local_health` și `health` public = 200 la fiecare verificare. Disk 23G/75G (32%, +1G față de baseline din noul release), RAM disponibilă ~2.9-3.0Gi stabilă. Erori 5xx recente în loguri: 0. Erorile pre-existente „Failed to find Server Action” din loguri sunt datate **înainte** de acest deploy (17:06 UTC, tab-uri de browser vechi cu bundle expirat) — nu au reapărut ca eroare nouă după switch.

---

## M. Regresii (smoke read-only)

| Suprafață | Rezultat |
|---|---|
| Homepage | 200 |
| Catalog | 200 |
| Search (`?q=bmw`) | 200 |
| Filters (categorie) | 200 |
| Listing detail | 200 |
| Sitemap + image sitemap | 200 |
| `/auth/login`, `/auth/register` | 200 |
| Publish gate (`/listings/new`, anonim) | 307 (redirect auth — comportament așteptat) |
| Dashboard | 200 |
| Messaging | 200 |
| Favorites | 200 |
| Business/upgrade | 200 |
| Payments page (fără inițiere plată) | 200 |
| `/admin/seo` (anonim) | 200 shell client-side, dar API de date dedesubt (`/api/admin/seo/status`) → **401 Neautentificat** (comportament pre-existent, neatins de fix) |
| IndexNow key | 404 (neconfigurat, neschimbat) |

Nicio regresie observată. Nu s-a inițiat nicio plată, nu s-a trimis niciun mesaj real.

---

## N. Monitorizare (~31 minute)

Verificări la T+0, T+~7min, T+~14min, T+~23min, T+~31min — toate: health 200, homepage 200, count 22 constant, Cache-Control corect constant, sitemap-uri 200, PM2 online cu 0 restarturi, zero 5xx. Nu a apărut niciun P0/P1. Rollback **nu** a fost necesar.

---

## O. Probleme rămase

- Worktree-ul local temporar de cherry-pick (`/tmp/faza22c-cherrypick.9DZJwa`, pe Mac) a fost păstrat (nešters) pentru trasabilitate; poate fi eliminat printr-un `git worktree remove` separat, la cerere.
- Worktree-urile reziduale din FAZA 21E pe VPS (`c984a8c9`, `rollback-ed22afed`, `f753f9d3`, `d18e0777`) rămân pe disc — în afara scopului acestei faze, nu au fost atinse.
- Proba de invalidare pe date reale de producție rămâne **neconfirmată** (intenționat, conform regulilor) — acoperită doar de testele locale E2E.
- Branch-ul `fix/homepage-listing-count-cache` este pe remote fără PR deschis; recomand deschiderea unui PR informativ (fără merge) pentru trasabilitate, dacă doriți.

## P. Confirmări obligatorii

| Confirmare | Răspuns |
|---|---|
| Deploy | **DA** (`6a043975` pe producție) |
| Rollback | **NU** (nu a fost necesar) |
| Migrare | NU |
| Date live modificate | **NU** — nicio mutație pe date reale; fixture-uri autorizate inexistente în această fereastră |
| FAZA 21E modificată/comisă/împinsă | NU |
| DNS/Cloudflare | NU (neatinse) |
| GSC/Bing/IndexNow | NU (neconfigurate, neatinse) |
| Stripe LIVE/plăți | NU (validare env pasivă la pornire PM2, fără nicio plată inițiată) |
| Email/SMS/push | NU |
| Merge/force/rebase/amend | NU |
| Uploaduri șterse | NU (1130 fișiere / 298M confirmate intacte înainte și după) |
| Backupuri șterse | NU (dump păstrat, doar baza temporară de restore a fost ștearsă, conform procedurii) |

---

**STOP.** Deploy finalizat cu succes, monitorizare de 31 minute fără incidente. Aștept confirmare/închidere sau instrucțiuni suplimentare.
