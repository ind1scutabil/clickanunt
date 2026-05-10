# Verificare finală SEO înainte de deploy producție — ClickAnunț (www.clickanunt.ro)

**Data verificării:** 2026-05-10 (workspace `auto-platform`)  
**Scope:** Canonical domain, robots, sitemap-uri, hub-uri categorie/oraș, listing metadata + JSON-LD, build producție.

---

## STEP 1 — Env + domain

### Comportament implementat (`lib/site-url.ts`)

- În **producție** (`NODE_ENV=production`), `siteOrigin()` returnează **întotdeauna** un origin sigur pentru indexare publică:
  - Dacă `NEXT_PUBLIC_SITE_URL` sau `NEXT_PUBLIC_APP_URL` lipsesc → **`https://www.clickanunt.ro`**.
  - Dacă valoarea conține `localhost`, `127.0.0.1`, `0.0.0.0`, `staging`, `vercel.app` sau este **`http://` pe origin public** → se **ignoră** și se folosește **`https://www.clickanunt.ro`**.
  - Dacă hostname-ul este exact **`clickanunt.ro`** (fără `www`), se normalizează la **`https://www.clickanunt.ro`**.
- În **development**, comportament anterior: permite `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` sau fallback `http://localhost:3000`.

### Fișiere care depind de `siteOrigin()` / `absoluteUrl()`

- `lib/seo.ts` — canonical, OG, breadcrumbs JSON-LD, Organization, WebSite SearchAction  
- `app/layout.tsx` — `metadataBase: new URL(siteOrigin())`, verificări SEO  
- `app/robots.ts` — host + URL-uri `sitemap`  
- `app/sitemap.ts` + `lib/seo/sitemap-queries.ts` + handlers `app/sitemap-serve/*`  
- `lib/seo/site-url-guard.ts` — warning dacă lipsesc explicit `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_APP_URL` în producție (nu modifică comportamentul de siguranță)  
- `app/listings/[id]/ListingJsonLd.tsx`, hub-uri `[categorySlug]`

### Fișiere verificate unde NU se folosește `localhost` pentru public SEO livrat crawlerilor

*(Scripturi `/tests`, `/playwright`, `redis localhost`, tooling — excluse de la „live SEO”.)*

| Zonă | Status |
|------|--------|
| `app/api/sitemap.xml` | **`308` → canonical `/sitemap.xml`** (`siteOriginForSeoFeeds()`) |
| ~~`app/sitemap.xml/route.ts`~~ | **Eliminat** (era `NEXTAUTH_URL \|\| http://localhost:3000`, includea `/auth/*` și liste duplicate) |

### Obligatoriu pe VPS

```bash
NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro
```

Fără el, producția este tot **sigură** pentru URL-uri publice (fallback + sanitizare), dar vei vedea **warning** în log; documentat în `SEO_FINAL_DEPLOYMENT_CHECKLIST.md` / `site-url-guard.ts`.

---

## STEP 2 — robots.txt (`app/robots.ts`)

- **Sursă unică:** `export default function robots()` (Next MetadataRoute).
- **`/robots.txt`:** rută **`○`** la build → funcționează.
- **Allow:** `/`, `/listings/`, `/about`, `/contact`, `/business`, `/security`.
- **Disallow:** `/api/`, `/admin/`, `/dashboard/`, `/account/`, `/auth/`, **`/login/`**, **`/register/`**, `/messages/`, căi promote/edit/messages per listing, `/_next/`, etc.
- **Sitemap-uri listate:** `sitemap.xml`, `sitemap-categories.xml`, `sitemap-cities.xml`, `sitemap-listings.xml` — toate cu prefix **`siteOriginForSeoFeeds()`** (= `siteOrigin()`).
- Rută efectivă auth publică este **`/auth/login`** (respectă `Disallow: /auth/`).

---

## STEP 3 — Sitemap-uri

| URL | Implementare |
|-----|----------------|
| `/sitemap.xml` | **`app/sitemap.ts`** — pagini core statice (+ `siteOrigin`) |
| `/sitemap-categories.xml` | rewrite → **`/sitemap-serve/categories`** — pillar + `(categorie,city)` din DB (**fără** duplicate `/auto/{city}` în acest fișier) |
| `/sitemap-cities.xml` | rewrite → **`/sitemap-serve/cities`** — doar **`/auto/{city}`** cu anunțe active |
| `/sitemap-listings.xml` | rewrite → **`/sitemap-serve/listings-index`** — **index** spre shards |
| `/sitemap-listings-{n}.xml` | shards `listing` (**max ~45 000**/shard prin constantă) |

**Verificări efectuate în cod:**

- XML generat cu `generateSitemapXML` / `generateSitemapIndexXml`; **fără** auth/admin/API în liste.
- **Fără** URL-uri bazate pe `NEXTAUTH_URL` pentru sitemap public (sură veche eliminată).
- Duplicate între shard-uri categorii oraș pentru auto: rezolvată prin excluderea pereilor auto din categories feed (doar în cities).

*(Validare XML pe server live după deploy: `curl -sSI` / `xmllint` opțional.)*

---

## STEP 4 — Pagini categorie + oraș

Rute **`app/[categorySlug]/page.tsx`** și **`app/[categorySlug]/[citySlug]/page.tsx`**:

- `generateMetadata` — titluri/description distincte per pagină, **canonical**, **`noindex` când count hub = 0** (Prisma în `hub-queries`).
- **`H1`** prin **`ListingsView`** (`pageTitle` = intro hub).
- **JSON-LD:** `BreadcrumbList` + `ItemList` când există preview-uri din DB.
- Breadcrumbs vizuale legate **`SeoMarketHubExtras`** + link-uri interne.
- Alias-uri (ex. `telefoane`) → **redirect** către slug canonic (ex. `electronice`).

Exemple după deploy: `/auto`, `/imobiliare`, `/electronice`, `/telefoane`→redirect), `/locuri-de-munca`, `/auto/bucuresti`, `/electronice/cluj-napoca`, `/imobiliare/iasi`.

*(Test manual pe date reale pentru `noindex` pe hub-uri fără anunțuri.)*

---

## STEP 5 — Listing SEO (`app/listings/[id]/layout.tsx`, `ListingJsonLd.tsx`)

- **Indexare (`robots`):** **`isListingSeoIndexable`** (`lib/seo/listing-seo-eligibility.ts`) — `deletedAt`, `status === active`, `moderationStatus approved`, nelipsit `expiresAt` în viitor.
- **`noindex`** pentru inactive / șterse / nemoderate favorable / respinse / marcate flagged / expirate → respectat în metadata.
- **Product/Offer JSON-LD:** emis **doar** pentru listing-uri eligible (altfel layout nu injectează Product).
- **OG image:** prima imagine normalizată sau default.
- Canonical: `/listings/{id}` relativ la `siteOrigin()`.

*(Pagina detaliu rămâne client-heavy pentru UX — metadata + JSON-LD sunt server-side.)*

---

## STEP 6 — Performanță SEO (observații — fără redesign)

- Hub-urile SEO sunt **React Server Components** + metadata server-side (**favorabil** crawl).
- **`/listings/[id]`** folosește în continuare `<img>` (lazy pe thumbs, eager pe hero) — **`next/image` nu este utilizat pe această pagină**; posibilă îmbunătățire ulterioară pentru LCP, nu blocker pentru deploy dacă KPI-urile actuale sunt acceptabile.
- `next.config.ts`: `removeConsole` în producție — reduce zgomot; OpenTelemetry/Sentry poate emite **warning webpack** la build (vezi STEP 7).

---

## STEP 7 — Build

Comenzi rulate cu succes:

```bash
npm run type-check
npm run lint
NODE_ENV=production npm run build
```

**Warning build (non-blocker):**  
`Critical dependency: the request of a dependency is an expression` — lanț **@opentelemetry** → **@sentry/node** → `lib/messaging-sentry.ts` → rute mesagerie. Nu este regresie SEO; poate fi urmărit separat dacă dorim build „clean”.

**Script:** `npm run type-check` (**nu** există alias `npm run typecheck`).

---

## STEP 8 — next.config și conflicte SEO

- **Rewrites** doar pentru `sitemap-*.xml` → `sitemap-serve/*` — **nu** localhost.
- **`poweredByHeader: false`**.
- **`removeConsole`** activ în producție.
- **`app/sitemap.xml/route.ts`** **eliminat** — eliminate **dubluri** `/sitemap.xml` și liste cu login/signup/listings brute.
- **Un singur** `robots.ts` MetadataRoute (backup `.bak` ignorat în runtime).

---

## STEP 9 — Modificări critice pentru siguranța deployului (rezumat tehnic)

1. **`app/sitemap.xml/route.ts`** — șters (conflict semantic + localhost + URLs nepotrivite).  
2. **`app/api/sitemap.xml/route.ts`** — redirect **308** → `/sitemap.xml` canon.  
3. **`lib/site-url.ts`** — hardening producție (**www**, fără host nesigur).  
4. **`lib/public-site-url.ts`** — în producție aliniat cu `siteOrigin()` (email forgot-password și altele care folosesc helperul).

---

## Comenzi deploy (recomandat)

```bash
npm ci
npm run db:migrate
NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run type-check && npm run lint && NODE_ENV=production npm run build
# restart proces (pm2/systemd/script intern)
```

## Variabile de mediu necesare pentru SEO corect

| Variabilă | Valoare |
|-----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.clickanunt.ro` |

Opțional: `GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_YANDEX_VERIFICATION`.

## URL-uri de test după deploy

- `https://www.clickanunt.ro/robots.txt`
- `https://www.clickanunt.ro/sitemap.xml`
- `https://www.clickanunt.ro/sitemap-categories.xml`
- `https://www.clickanunt.ro/sitemap-cities.xml`
- `https://www.clickanunt.ro/sitemap-listings.xml`
- `https://www.clickanunt.ro/api/sitemap.xml` (trebuie să redirecționeze către `/sitemap.xml`)
- Pagini pillar + oraș enumerate la STEP 4
- Listing activ + listing respins/expirat pentru `robots`/JSON-LD

## Lista exactă pentru Search Console (submit sitemaps)

1. `https://www.clickanunt.ro/sitemap.xml`  
2. `https://www.clickanunt.ro/sitemap-categories.xml`  
3. `https://www.clickanunt.ro/sitemap-cities.xml`  
4. `https://www.clickanunt.ro/sitemap-listings.xml`

## Riscuri rămase / pași recomandați post-launch

- **Moderare strictă SEO:** Doar **`approved`** intră în index — anunțe long pending nu apar în Google până la aprobare (comportament intenționat pentru calitate index).
- **Preprod subdomain** fără cuvânt `staging` în URL ar putea trece sanitizarea `siteOrigin`; evitați setarea `NEXT_PUBLIC_SITE_URL` pe domenii neoficiale în NODE_ENV production.
- **LCP listing:** Migrare graduală către `next/image` pentru galerii.
- După primele crawl-uri: reconcilierea **apex vs www** la nivel DNS/redirect dacă utilizatorii încă accesează `clickanunt.ro` fără redirect 301 către www (la nivel infra, nu modificat în acest ciclu dacă nginx face deja).

---

## Fișiere verificate / relevante pentru audit SEO (non-exaustiv)

- `lib/site-url.ts`, `lib/public-site-url.ts`, `lib/seo/site-url-guard.ts`, `lib/seo.ts`
- `lib/seo/market-paths.ts`, `lib/seo/hub-queries.ts`, `lib/seo/sitemap-queries.ts`, `lib/seo/listing-seo-eligibility.ts`
- `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`
- `app/sitemap-serve/categories/route.ts`, `.../cities/route.ts`, `.../listings-index/route.ts`, `.../listings/[chunk]/route.ts`
- `app/[categorySlug]/page.tsx`, `app/[categorySlug]/[citySlug]/page.tsx`
- `app/components/seo/GlobalJsonLd.tsx`, `SeoMarketHubExtras.tsx`
- `app/listings/[id]/layout.tsx`, `ListingJsonLd.tsx`
- `next.config.ts`
- ~~`app/sitemap.xml/route.ts`~~ (eliminat)

---

## Concluzie verificator

După remedierile de mai sus și build verde: **deploy-ul SEO este tratat ca SAFE pentru producție** cu condiția setării explicite a `NEXT_PUBLIC_SITE_URL` și rulării migrațiilor/obiceiului vostru de release. Nu există **blocker** rămas din verificarea statică cod + build în workspace.
