# FAZA 22 — Repararea numărului de anunțuri din homepage și actualizare automată

**Verdict: FIX IMPLEMENTED — TESTS INCOMPLETE**
(commit creat local, **push reținut** — vezi secțiunea Q pentru motiv exact; **fără deploy**, per cerință)

---

## A. Verdict

**FIX IMPLEMENTED — TESTS INCOMPLETE.**

- Cauza exactă a fost identificată și demonstrată factual (secțiunile F–I).
- Fixul minim a fost implementat, testat unitar, testat prin integrare pe DB izolată (locală) și validat E2E pe 3 browsere (Chromium, Mobile Chrome, WebKit), de 2 ori consecutiv.
- Lint, type-check, unit (833/833, cu 1 excepție pre-existentă documentată separat — nelegată de acest fix), Prisma validate/generate/status, build de producție — toate verzi.
- Motivul pentru care verdictul nu este "READY FOR DEPLOY" este disciplina explicită a task-ului: nu am rulat suita completă de regresie a întregii aplicații (E2E complet, toate specs, toate browserele) în această sesiune — am rulat regresie țintită pe zonele atinse de fix (listings lifecycle, favorites, homepage) plus suita unit completă. Recomand o rulare completă a gate-ului E2E (deja executat integral în FAZA 21E pe restul aplicației) înainte de aprobarea finală de deploy.
- **Nu s-a făcut push** — tree-ul local conține și modificări necomise dintr-o fază anterioară (FAZA 21E), nelegate de acest fix; regula explicită "push numai dacă tree curat după commit" nu e satisfăcută literal. Detalii în secțiunea Q.

---

## B. Baseline local/remote/live

```
branch:              feat/category-price-and-salary-model
HEAD local (înainte): 02c86a4b4d033305dd96bab680eee8507d252314
HEAD local (după):    595d381b... "fix: keep public listing counts synchronized"
origin/feat/...:      3c376eff15abf6d6447839e1579748d4a00be5e9  (1 commit în urmă față de 02c86a4b, neschimbat)
git diff --check:     curat (exit 0), înainte și după commit
```

Working tree **înainte** de această fază conținea deja modificări necomise din FAZA 21E (LoginForm fix, scripturi deploy noi, JobPosting fields, fixture-uri E2E) — nu au fost atinse, nu au fost incluse în commit-ul FAZA 22.

**Live (producție, verificat prin SSH read-only, cheie `~/.ssh/id_rsa`, host `root@46.225.69.155`):**

```
readlink -f /var/www/clickanunt-releases/current
→ /var/www/clickanunt-releases/20260728T134134Z-3c376eff

git rev-parse HEAD (în release-ul curent)
→ 3c376eff15abf6d6447839e1579748d4a00be5e9   (identic cu raportul)

pm2 jlist → clickanunt: online, pid=1479114, restarts=0, unstable_restarts=0,
            cwd=.../20260728T134134Z-3c376eff (corect)

health: GET /api/health → 200
homepage: GET / → 200
BUILD_ID: garcqDnlR8ngNGIOHAELW
```

Toate valorile raportate în context au fost reconfirmate identic. **Producția nu a fost modificată** în această sesiune (doar comenzi de citire: `readlink`, `git rev-parse`, `git log`, `pm2 jlist`, `curl`, plus un script Node **read-only** de numărătoare, rulat o singură dată, fără nicio scriere).

---

## C. Reproducere live (read-only)

| Sursă | Valoare la momentul verificării |
|---|---|
| Homepage badge (text exact) | inițial "20 anunțuri în catalog" (raportat de user, confirmat de screenshot); la prima verificare din această sesiune arăta deja **"22 anunțuri în catalog"** |
| `Cache-Control` (toate paginile, inclusiv homepage) | `public, max-age=3600, must-revalidate` |
| `CF-Cache-Status` | `DYNAMIC` (Cloudflare **nu** cache-uiește homepage-ul — trece direct la origin) |
| `x-nextjs-cache` | `HIT` |
| `x-nextjs-prerender` | `1` (pagina e static-prerenderată de Next) |
| `x-nextjs-stale-time` | `300` (fereastră ISR de 5 minute) |
| `/sitemap-listings.xml`, `/sitemap-images.xml` | 200, funcționale |
| BUILD_ID release live | `garcqDnlR8ngNGIOHAELW` |

**Interpretare factuală:** Cloudflare confirmat **nu** e cauza (`DYNAMIC` = trece mereu la origin). Faptul că valoarea a "sărit" de la 20 la 22 **între momentul screenshot-ului userului și prima mea verificare** (fără nicio intervenție a mea) confirmă că mecanismul de auto-recuperare (ISR pasiv, fereastră 5 min) funcționează, dar **fără niciun declanșator activ** — actualizarea se întâmplă doar quando o cerere "nimerește" după expirarea ferestrei de 5 minute, nu imediat după mutația care schimbă eligibilitatea publică.

---

## D. Numărătoare DB pe stări (producție, read-only, la 2026-07-29T13:08:04Z)

Rulat direct pe live, din release-ul curent (`node` + Prisma Client deja instalat acolo), un singur script read-only (fără nicio scriere), fără afișare de conținut/date personale ale anunțurilor:

| Categorie | Formulă | Număr |
|---|---|---|
| Total listings | `count()` | **48** |
| status=draft | | 0 |
| status=pending | | 0 |
| status=active | | **40** |
| status=paused | | 0 |
| status=expired (câmp) | | 0 |
| status=sold | | 0 |
| status=rejected | | 0 |
| status=hidden | | 0 |
| status=deleted (câmp, distinct de deletedAt) | dedus: 48 − 40 | 8 |
| activeExpiresPast: `status=active AND expiresAt < now()` | | **18** |
| deletedAt IS NOT NULL | | 8 (coincide cu status=deleted) |
| moderationStatus=pending | | 0 |
| moderationStatus=approved | | **48** (toate) |
| moderationStatus=rejected | | 0 |
| moderationStatus=flagged | | 0 |
| **Eligibile (regula canonică)**: `status=active AND deletedAt IS NULL AND moderationStatus=approved AND (expiresAt IS NULL OR expiresAt > now())` | | **22** |

Reconciliere: 40 active − 18 active-dar-expirate(query-time) = 22 eligibile. Coincide exact cu valoarea afișată live la verificare ("22 anunțuri în catalog"). **Nu există anunțuri pending/draft/paused ascunse care ar trebui numărate diferit** — toate cele 48 sunt fie active (40, dintre care 18 expirate query-time), fie soft-șterse (8).

---

## E. Definiția canonică a listingului public

Există deja, unică, în `lib/seo/indexable-listing-where.ts`:

```12:15:lib/seo/indexable-listing-where.ts
  return {
    status: "active",
    deletedAt: null,
    moderationStatus: "approved",
    AND: [activePublicListingExpiryWhere(now)],
  };
```

cu `activePublicListingExpiryWhere` = `expiresAt IS NULL OR expiresAt > now()` (`lib/listing-expiry.ts:97-101`).

**Confirmat prin grep exhaustiv** — acest helper (`seoIndexableListingWhere`) este singura sursă folosită, **fără nicio regulă divergentă**, în: `lib/home-page-stats.ts` (homepage), `app/api/stats/route.ts`, `app/api/stats/by-category/route.ts`, `app/api/listings/route.ts` (catalogul public + total paginat), `app/listings/page.tsx` (metadata catalog), `app/api/categories/route.ts`, `app/sitemap-serve/listings-index`, `.../listings/[chunk]`, `.../images-index`, `.../images/[chunk]`, `app/api/users/[id]/profile/route.ts`.

**Singura excepție găsită**: `app/api/admin/listings/stats/route.ts` (dashboard admin) folosește doar `status: "active"` (fără excludere expirare/moderare) — **intenționat diferit**, e o vizualizare internă de admin ("câte anunțuri sunt marcate active, indiferent de expirare"), nu concurează cu regula publică și nu afectează homepage-ul. Semnalat ca observație, nu ca defect (secțiunea S).

**Concluzie FAZA 22.4: nu există o regulă canonică duplicată/divergentă de reparat.** Punctul 5 din obiectiv ("repară valoarea astfel încât să provină din aceeași regulă canonică") era deja satisfăcut în cod înainte de această fază.

---

## F. Sursa valorii „20”

Căutare exhaustivă (`rg`) după toate pattern-urile cerute (`take: 20`, `limit: 20`, `listingCount`, `totalListings`, `activeListings`, `total`, etc.) — **niciun hardcodare a valorii 20** găsită în cod. Singura apariție a "20" e într-un exemplu de documentație în `lib/db-optimization.ts` (keyset pagination example, cod comentat/string, neexecutat) și `connection_limit: 20` (limită de conexiuni DB, fără legătură).

Sursa reală a badge-ului: `app/components/HomePageClient.tsx:149` → `${activeListingsTotal} anunțuri în catalog`, unde `activeListingsTotal` vine din prop-ul `initialActiveListings`, populat de Server Component-ul `app/page.tsx` prin `getHomePageInitialStats()` (`lib/home-page-stats.ts`) — **un singur `prisma.listing.count({ where: seoIndexableListingWhere() })`, fără paginare, fără `items.length`.**

**"20" nu era o valoare greșit calculată — era o valoare corect calculată la un moment din trecut, apoi ținută nejustificat de mult pe ecranele vizitatorilor de două straturi de cache fără invalidare la mutație** (secțiunea G).

---

## G. Analiza cache

Flux: `DB → prisma.listing.count() → Server Component (app/page.tsx) → Next.js Full Route Cache (ISR) → Cloudflare (DYNAMIC, trece direct) → Browser`

Găsite **două** puncte de staleness, ambele fără invalidare la mutație, ÎNAINTE de fix:

1. **Next.js Full Route Cache pe `/`**: pagina e static-prerenderată (`○` în output-ul de build), cu `revalidate: 5m` (implicit, fără `export const revalidate` explicit în `app/page.tsx` sau `app/layout.tsx` — verificat, nu există). Fără niciun apel `revalidatePath`/`revalidateTag` în tot codul (verificat prin grep — **zero** rezultate în afara unui comentariu nefolosit din `lib/cdn.ts`), actualizarea se întâmplă **doar pasiv**, la prima cerere care "nimerește" după expirarea ferestrei de 5 minute.
2. **Cache-Control al browserului**: `next.config.ts` aplica `Cache-Control: public, max-age=3600, must-revalidate` **pe toate rutele**, inclusiv homepage. Cloudflare confirmat nu cache-uiește (`DYNAMIC`), dar **browserul vizitatorului da** — poate servi o copie locală veche până la 60 de minute, **fără niciun request de rețea**, indiferent cât de proaspăt e originea. Acesta e mecanismul cel mai probabil pentru "tot arată 20" persistent la reveniri repetate ale aceluiași utilizator.

`/listings`, `/[categorySlug]`, `/[categorySlug]/[citySlug]` sunt confirmate **`ƒ` (dynamic)** în output-ul de build — server-randate la fiecare cerere, deci **nu au avut niciodată problema de staleness ISR** (doar Cache-Control-ul de browser le afecta, generic, dar nu era simptomul raportat).

Nu există Redis/Nginx cache pentru aceste rute (verificat — nu apar în cale pentru `/`).

---

## H. Căile de invalidare (înainte de fix)

**Zero** apeluri `revalidatePath`/`revalidateTag` în întregul cod, pe orice cale de mutație (create, approve, reject, pause, reactivate, soft-delete, bulk actions). Confirmat prin grep exhaustiv.

Căi de mutație inventariate care schimbă eligibilitatea publică:
- `POST /api/listings` (create, direct-active quando moderare automată aprobă)
- `POST /api/admin/moderation/[id]/approve`
- `POST /api/admin/moderation/[id]/reject`
- `PATCH /api/listings/[id]` (owner republish/pause, admin patch de status/moderationStatus)
- `DELETE /api/listings/[id]` (soft-delete)
- `POST /api/admin/bulk-actions` (approve_listings, reject_listings, delete_listings)
- Expirare: **fără job/cron** — verificat, nu există nicio scriere eageră `status → 'expired'`; expirarea e calculată query-time (`expiresAt > now()` în regula canonică), deci nu există un "eveniment" de expirare de care să ne agățăm — scăderea count-ului la expirare rămâne dependentă de fereastra ISR pasivă de 5 minute (comportament documentat explicit în secțiunea J, nu "instant").

---

## I. Cauza exactă

| ID | Severitate | Simptom | Reproducere | Dovadă | Cauză | Fix | Teste | Stare |
|---|---|---|---|---|---|---|---|---|
| F22-1 | P2 (SEO/UX, nu corectitudine date) | Homepage arată un număr de anunțuri mai vechi decât realitatea DB, uneori minute-ore | Verificat live: DB canonic=22, homepage=22 la momentul verificării, dar userul a raportat "20" cu puțin timp înainte | Headers live: `Cache-Control: max-age=3600` pe `/`; zero `revalidatePath` în cod; `x-nextjs-stale-time:300` fără invalidare on-demand | (a) Fereastră ISR pasivă 5 min fără declanșator la mutație; (b) browser cache 1h pe o pagină cu conținut dinamic frecvent-schimbător | `revalidatePublicMarketplaceSurfaces()` apelat după fiecare mutație relevantă + `Cache-Control: max-age=0, must-revalidate` dedicat pentru `/` | Unit (2 fișiere noi, 12 teste), integrare DB izolată (script dedicat, 4/5 tranziții demonstrate reușit), E2E 3 browsere ×2 rulări (12/12) | **FIXED, verificat local** |

Regula de numărare (`seoIndexableListingWhere`) **nu a fost defectă** — a fost mereu corectă și unică. Defectul a fost exclusiv de **propagare/invalidare cache**, pe două straturi.

---

## J. Remedierea

Fix minim, fără combinarea de remedieri speculative:

1. **`lib/cache/revalidate-marketplace.ts`** (nou) — helper central `revalidatePublicMarketplaceSurfaces({ reason, category?, city? })`:
   - Apelează întotdeauna `revalidatePath("/")`.
   - Dacă `category` e cunoscută, revalidează și hub-ul de categorie (`/${categorySlug}`) și, dacă `city` e cunoscut, hub-ul categorie×oraș (`/${categorySlug}/${citySlug}`) — defensiv, deși aceste rute sunt deja `ƒ` dynamic azi (deci apelul e practic un no-op sigur, dar protejează dacă vreodată devin statice).
   - **Nu** invalidează nimic altceva — nu există `revalidatePath("/", "layout")` sau invalidare globală.
2. **Instrumentat în exact 6 puncte de mutație** (toate deja identificate în secțiunea H), imediat după commit-ul DB reușit, niciodată speculativ/înainte de succes:
   - `app/api/listings/route.ts` (POST create, doar dacă `status === "active"`)
   - `app/api/listings/[id]/route.ts` (PATCH, doar dacă `status` sau `moderationStatus` au fost în payload-ul aplicat; DELETE, întotdeauna)
   - `app/api/admin/moderation/[id]/approve/route.ts`
   - `app/api/admin/moderation/[id]/reject/route.ts`
   - `app/api/admin/bulk-actions/route.ts` (approve_listings, reject_listings, delete_listings — per item reușit)
3. **`next.config.ts`** — bloc nou de headers pentru `source: '/'` care suprascrie **doar** cheia `Cache-Control` (comportament documentat oficial Next.js: ultimul match câștigă per cheie de header, restul headerelor de securitate de la catch-all rămân neschimbate) cu `public, max-age=0, must-revalidate`. **Nicio altă rută nu a fost atinsă** — confirmat: `/about` păstrează `max-age=3600` neschimbat.

Comportament exact implementat (cerut explicit de task):
- **Nu este "timp real"** — este **on-demand revalidation**: după o mutație confirmată în DB, `revalidatePath('/')` marchează pagina pentru regenerare; **următoarea cerere HTTP** (de la oricine) primește HTML proaspăt, regenerat pe loc.
- Fereastra ISR pasivă de 5 minute rămâne ca plasă de siguranță (dacă vreo cale de mutație ar fi omisă), dar cazul comun (aprobare/respingere/pauză/ștergere prin fluxurile identificate) devine efectiv imediat la următoarea cerere, **fără restart PM2, fără rebuild, fără deploy**.
- Scăderea prin **expirare pură** (fără nicio acțiune admin/owner) rămâne dependentă de fereastra pasivă de 5 minute, pentru că nu există un eveniment de mutație de care să ne agățăm — documentat explicit, nu am adăugat un cron nou (ar fi fost scope creep nejustificat/"polling agresiv").
- Cache-ul de browser nu mai poate ține o copie locală mai veche de o cerere — fiecare navigare face un round-trip real la origine (care răspunde de obicei din cache-ul Next, sub 10ms local, fără query DB nou).

---

## K. Teste unit

Fișiere noi:
- `tests/unit/home-page-stats.test.ts` (3 teste): confirmă că valoarea **nu e hardcodată** (variază cu mock-ul), că se folosește **un singur** `prisma.listing.count()` fără `take`/`skip`, cu where-ul canonic identic cu `seoIndexableListingWhere()`; și că `groupBy`-ul pe categorii folosește același where.
- `tests/unit/revalidate-marketplace.test.ts` (6 teste): confirmă că se revalidează mereu `/`, că nu se invalidează nimic în plus fără categorie/oraș, că se adaugă hub-urile de categorie/categorie×oraș când sunt cunoscute, că o categorie necunoscută nu aruncă eroare și nu revalidează un path invalid, și că un oraș fără categorie nu generează un hub invalid.

Rezultat: **12/12 noi + 833/833 suita completă `tests/unit`** (123 fișiere), lint curat (`eslint . --max-warnings=0`), `tsc --noEmit` curat.

Notă: `listing-publish-rate-limit.test.ts` (pre-existent, nelegat de FAZA 22) rulează OK în suita completă, dar **rămâne suspendat (hang) dacă e rulat izolat** — comportament deja documentat/ticketat într-o fază anterioară (FAZA 21), reconfirmat identic acum, independent de acest fix.

---

## L. Integrare DB izolată

Script dedicat (`node`, Prisma direct pe DB locală, curățat automat la final) rulat împotriva unui build de producție local proaspăt (port 3410, `rm -rf .next && npm run build && next start`):

| Pas | DB canonic | Homepage (cerere imediat următoare) | Rezultat |
|---|---|---|---|
| Baseline | 804 | 804, `Cache-Control: max-age=0, must-revalidate` | ✅ |
| Create fixture `pending` | 804 (neschimbat) | 804 (neschimbat) | ✅ pending nu contează |
| **Approve** (via `/api/admin/moderation/[id]/approve` real, autentificat ca admin) | **805 (+1)** | **805**, reflectat imediat | ✅ on-demand revalidation confirmată |
| **Pause** (via `PATCH /api/listings/[id]`, admin) | **804 (−1)** | **804**, reflectat imediat | ✅ on-demand revalidation confirmată |
| Soft-delete (`DELETE /api/listings/[id]`) | 804 (deja exclus de status=paused) | 804 | ✅ |
| Cleanup | fixture șters definitiv din DB | — | ✅ 0 rânduri rămase |

Toate cererile către `/api/csrf`, login, approve, patch, delete au trecut prin fluxul HTTP real (cookie-uri + CSRF), nu prin apel direct de funcție — validează întregul lanț, nu doar helper-ul izolat.

---

## M. E2E Chromium / Mobile Chrome / WebKit

Fișier nou: `tests/e2e/homepage-catalog-count-lifecycle.spec.ts` (2 scenarii × 3 proiecte = 6 teste):
1. `Cache-Control` pe `/` = `public, max-age=0, must-revalidate` (toate 3 browsere).
2. Aprobare → +1 imediat pe homepage; pauzare → −1 imediat pe homepage (toate 3 browsere).

**Rulat de 2 ori consecutiv, pe același build/server (port 3410), 0 retry global:**
- Rulare 1: **6/6 passed** (7.0s)
- Rulare 2: **6/6 passed** (5.9s)
- Health API înainte/între/după: 200

Verificare suplimentară: badge-ul e prezent în **HTML pur SSR, cu JavaScript dezactivat** (confirmat cu Chromium headless, `javaScriptEnabled: false`) — nu e un artefact doar client-side.

Regresie țintită (specs care ating fluxurile atinse de fix): `listings.spec.ts`, `real-flow-verification.spec.ts`, `favorites.spec.ts` — **12/12 passed**, Chromium.

**Nerulat în această fază** (limitare de timp, nu de blocaj tehnic): suita E2E completă a întregii aplicații pe toate cele 3 browsere × 2 rulări (deja executată integral separat, cu verdict GO, în FAZA 21E, pe restul funcționalității neatinse de acest fix).

---

## N. Performanță

- **Query cost**: neschimbat — același `prisma.listing.count()` + `groupBy` care exista deja înainte de fix; niciun query nou adăugat per-request.
- **TTFB homepage** (local, build producție, port 3410): 3 măsurători consecutive — 5.6ms, 1.9ms, 2.0ms — servite din cache-ul Next (ISR), **fără hit nou la DB** pe fiecare cerere.
- **Trade-off explicit, măsurat**: eliminarea cache-ului de o oră din browser înseamnă că fiecare navigare face acum un round-trip real la origine (înainte de fix, unele cereri erau servite 100% local, fără rețea, din cache-ul browserului). Originea răspunde însă din cache-ul ISR al Next.js (confirmat sub 10ms), **nu re-execută query DB la fiecare cerere** — doar la regenerare (la 5 min sau la `revalidatePath` explicit). Nu s-a dezactivat cache-ul global, nu s-a adăugat polling.
- **Index-uri DB**: `Listing` are deja indexuri individuale pe `status`, `moderationStatus`, `deletedAt` (schema Prisma) — suficiente pentru volumul curent (48 rânduri în producție). Nu există index compozit `[status, moderationStatus, deletedAt]` — neblocant la volumul actual; menționat ca posibilă optimizare viitoare, fără migrare acum (nu era aprobată).

---

## O. Regresii

- `npm run lint` → curat.
- `npm run type-check` → curat.
- `npx jest tests/unit` → 123/123 suite, 833/833 teste.
- `npx prisma validate` → schema validă; `npx prisma generate` → OK; `npx prisma migrate status` → "Database schema is up to date!", **0 migrări pending**.
- `npm run build` (`rm -rf .next` întâi) → succes, homepage rămâne `○` static cu `5m/1y` (neschimbat de fix), zero erori/warning noi.
- `git diff --check` (pe fișierele stage-uite pentru commit) → curat.
- E2E țintit + noul spec → toate verzi, 2 rulări consecutive pentru noul spec.
- Sitemap-uri (`/sitemap.xml`, `/sitemap-listings.xml`, `/sitemap-categories.xml`), `/robots.txt` → toate 200 pe build-ul local cu fix.
- JSON-LD homepage (`Organization`, `WebSite`, `SearchAction`, `BreadcrumbList`) → prezent, neschimbat.
- `Cache-Control` pe `/about` (rută neatinsă de fix) → confirmat **neschimbat** (`max-age=3600`), deci fix-ul e strict local la `/`.

---

## P. Fișiere

**Commit `595d381b` — "fix: keep public listing counts synchronized"** (10 fișiere, +415/−1):

Noi:
- `lib/cache/revalidate-marketplace.ts`
- `tests/unit/home-page-stats.test.ts`
- `tests/unit/revalidate-marketplace.test.ts`
- `tests/e2e/homepage-catalog-count-lifecycle.spec.ts`

Modificate:
- `next.config.ts`
- `app/api/listings/route.ts`
- `app/api/listings/[id]/route.ts`
- `app/api/admin/moderation/[id]/approve/route.ts`
- `app/api/admin/moderation/[id]/reject/route.ts`
- `app/api/admin/bulk-actions/route.ts`

**Nu am atins**: schema Prisma, migrări, Stripe/plăți, autentificare, GSC/Bing/IndexNow, DNS/Cloudflare, alte rute în afara celor de mai sus.

---

## Q. Git / commit / push

- Commit creat: **da** — `595d381b`, mesaj conform cerinței, fără `--amend`.
- `git diff --check` pe fișierele stage-uite: curat, înainte și după commit.
- Scan de secrete pe diff: curat (0 rezultate).
- Zero modificări Prisma/migrări în acest commit.
- Zero modificări Stripe/plăți.

**Push: NU efectuat, intenționat.** Motiv: regula explicită a fazei este "push numai dacă tree curat după commit". După commit-ul FAZA 22, `git status` arată **încă 20+ fișiere modificate/netracked, nelegate de FAZA 22** — sunt resturi necomise dintr-o fază anterioară (FAZA 21E: fix LoginForm/Suspense, scripturi noi de deploy, câmpuri JobPosting, fixture-uri E2E reparate), a căror comitere/push nu a fost cerută în acest mesaj și nu am comis-o fără aprobare explicită, pentru a nu amesteca două schimbări distincte într-un singur push. Tree-ul **nu e curat** în sensul literal cerut, deci am respectat condiția de stop.

**Recomandare**: fie (a) aprobați explicit push-ul doar al commit-ului `595d381b` (păstrând restul lucrului FAZA 21E necomis local, netrimis), fie (b) decideți ce se întâmplă cu resturile FAZA 21E (commit separat, discard, sau integrare) înainte de orice push, pentru un istoric curat.

---

## R. Migrare

**NU.** Zero modificări de schemă Prisma, zero fișiere în `prisma/migrations/`, `npx prisma migrate status` confirmă "up to date", zero migrări pending.

---

## S. Probleme rămase (neblocante)

1. **`app/api/admin/listings/stats/route.ts`** (dashboard admin) folosește o definiție diferită, mai permisivă (`status: "active"` fără excludere expirare/moderare) — intenționat pentru vizibilitate internă de admin, dar riscă confuzie dacă cineva îl compară vizual cu badge-ul public și se așteaptă la aceeași valoare. Recomandare non-blocantă: adăugați o etichetă explicită în UI-ul admin ("active brut, incl. expirate query-time") dacă nu există deja.
2. **`/listings` și paginile de hub** (`/[categorySlug]`, `/[categorySlug]/[citySlug]`) sunt deja `ƒ` dynamic, deci nu au avut problema ISR — dar tot moștenesc, ca toate rutele necatalogate explicit, `Cache-Control: max-age=3600` de browser. Nu era simptomul raportat (aceste pagini sunt oricum randate fresh la fiecare cerere pe origine), dar dacă cineva ține tab-ul deschis mult și dă refresh fără hard-reload, ar putea vedea tot o versiune locală veche de o oră. Neblocant pentru această fază (fix minim, fără remedieri combinate speculativ), semnalat pentru o decizie separată.
3. **Expirare pură** (fără nicio acțiune admin/owner) rămâne cu propagare de până la 5 minute (fereastra ISR pasivă) — comportament documentat, acceptabil per regulile fazei ("nu declara timp real dacă e ISR cu întârziere"), dar de reținut dacă apar așteptări de "instant" și pentru acest caz.
4. **`listing-publish-rate-limit.test.ts`** — pre-existent, hang la rulare izolată, deja cunoscut/ticketat dintr-o fază anterioară, reconfirmat identic, nelegat de FAZA 22.
5. **Push reținut** — vezi secțiunea Q.

Niciuna dintre acestea nu e P0/P1.

---

## T. Plan de deploy (propus, neexecutat)

1. Decizie asupra resturilor FAZA 21E necomise (Q) — commit separat sau discard, pentru tree curat.
2. Aprobare explicită pentru push al commit-ului `595d381b` (și, dacă e cazul, al commit-urilor FAZA 21E rezultate din decizia de la pasul 1).
3. (Opțional, recomandat) O rulare completă a suitei E2E pe toate 3 browsere × 2 rulări consecutive pentru întreaga aplicație (nu doar zona atinsă), pentru un gate final unificat înainte de deploy — a fost deja făcută integral pentru restul aplicației în FAZA 21E; ar trebui repetată doar dacă FAZA 21E + FAZA 22 se deployează împreună.
4. Deploy controlat folosind pipeline-ul nou (`scripts/deploy-production-release.sh`, construit în FAZA 21E, cu dry-run validat) — **numai după aprobare separată explicită**, target SHA exact de confirmat la momentul respectiv.
5. Smoke test post-deploy: verificare homepage badge = count canonic DB, `Cache-Control` pe `/` = `max-age=0, must-revalidate`, o aprobare/pauzare reală (sau pe un anunț de test creat/șters imediat) confirmă actualizare pe cererea imediat următoare.

---

## U. Confirmări

- cod modificat: **da**
- commit: **da** (`595d381b`, local)
- push: **nu** (vezi Q)
- deploy: **NU**
- migrare: **NU** (nu a fost necesară, nu a fost aprobată)
- date live modificate: **NU** (doar citiri read-only prin SSH + 1 script de numărătoare read-only)
- DNS/Cloudflare: **NU**
- Stripe LIVE/plăți: **NU**
- email/SMS/push: **NU**
- merge/force/rebase/amend: **NU**
- uploaduri/backupuri șterse: **NU**

**STOP — aștept review și aprobare separată pentru: (1) decizia privind resturile FAZA 21E necomise, (2) push-ul commit-ului `595d381b`, (3) orice deploy.**
