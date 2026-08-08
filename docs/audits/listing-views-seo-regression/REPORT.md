# Listing views & SEO regression — audit and candidate

**Date:** 2026-08-08
**Site:** https://www.clickanunt.ro
**Repository worktree:** `/Users/ind1scutabil/projects/ca-views-fix`
**Branch:** `fix/listing-views-and-image-crawl-regression`
**Parent (live SHA):** `32608f1e10f409e86d8575e2d015442fa530c0e8`
**Original dirty workspace left untouched:** `/Users/ind1scutabil/projects/auto-platform` on `fix/auto-listing-last-registration-country`

No production writes were performed. No `views` columns were manually edited. No deploy/push performed.

---

## Phase 0 — Baseline

| Item | Value |
|------|-------|
| Repository | `https://github.com/ind1scutabil/clickanunt.git` (`origin`) |
| Live `/api/version` | `gitCommit=32608f1e10f409e86d8575e2d015442fa530c0e8`, `buildTime=2026-08-08T07:56:01.148Z`, `environment=production` |
| Local HEAD before worktree | `0660f2d7` (dirty mobile WIP — not used) |
| Worktree base | `32608f1e` (exact live SHA) |
| Node | `v25.9.0` |
| npm | `11.12.1` |
| AGENTS.md | **not present** in repository; README + `docs/` used instead |

---

## Verdict

### Cauza principală

Pagina de detalii anunț este server-rendered cu `initialListing`. Clientul apelează `GET /api/listings/{id}` **numai când `initialListing` lipsește**. Singurul loc din cod care incrementează `listing.views` era acel GET. Pentru vizitele normale (SSR), niciun request nu mai înregistrează vizita → contorul rămâne înghețat.

### Impact

- Toate anunțurile publicate după deploy-ul regresiei SSR rămân la 0 vizualizări indiferent de trafic real.
- Anunțurile vechi păstrează valorile istorice, dar nu mai cresc (control: Peugeot 42 → 42 după acces real cu Chromium).
- Catalog live la momentul auditului: **39** anunțuri active, **38** cu views > 0, **1** (Skoda, creat 2026-08-06) cu 0.

### Interval probabil al regresiei

- Commit introductiv: **`79584c5f68c9a77c8a6a057ef91209e63a7f9818`** (2026-07-28) — `fix: stabilize marketplace layouts and accessible contrast`
- Demonstrat prin `git show`: adaugă `initialListing` și schimbă `if (id) loadListing()` în `if (id && !initialListing)`.
- Live SHA `32608f1e` îl conține (`git merge-base --is-ancestor 79584c5f 32608f1e` → YES).

### Commit vinovat demonstrat

```
79584c5f68c9a77c8a6a057ef91209e63a7f9818
2026-07-28 10:21:24 +0100
fix: stabilize marketplace layouts and accessible contrast
```

Diff relevant în `ListingDetailPageClient.tsx`:

- înainte: `if (id) { void loadListing() }`
- după: `if (id && !initialListing) { void loadListing() } else if (initialListing) { setLoading(false) }`

---

## Dovezi live (read-only)

### Contor

| Test | Înainte | Acțiune | După | Rezultat |
|------|---------|---------|------|----------|
| Read-only catalog | Skoda=0, Peugeot=42 | `GET /api/listings?limit=100&status=active` | neschimbat | Sursă sigură (fără increment în `route.ts` list) |
| SSR HTML only | Skoda=0 | `curl` pagina | Skoda=0 | Nu incrementează |
| Chromium direct | Skoda=0 | Playwright goto listing | Skoda=0 | **ZERO** request-uri `/api/listings/{id}` sau `/view` |
| Chromium refresh | Skoda=0 | reload | Skoda=0 | Niciun beacon |
| Click din `/auto` | Skoda=0 | client nav | Skoda=0 | Doar GET catalog `/api/listings?page=…`, fără detail GET |
| Control Peugeot | 42 | accesat în aceleași sesiuni | 42 | Confirmat înghețat pentru toate anunțurile |

**Dovadă browser (producție):**
`network calls (A): (NONE)` / `RESULT: Skoda 0 -> 0 | Peugeot 42 -> 42`

### SEO / imagini / search

| Observație | Dovadă |
|------------|-------|
| `robots.txt` blochează `/api/` (+ Cloudflare Managed Content prepended) | `curl https://www.clickanunt.ro/robots.txt` |
| Imagini HTML/JSON-LD/sitemap = `/api/uploads/serve?key=…` | 84× în HTML Skoda; **186/186** în `sitemap-images-0.xml` |
| Googlebot / Googlebot-Image / Bingbot / `*` → image **BLOCKED** | `robots-parser` pe robots live |
| `/uploads/...` static totuși 200 | curl Googlebot-Image pe path static |
| SSR search `?q=Skoda` → 0 linkuri; API → 7 | curl HTML vs API |
| Același pattern Octavia (0 vs 7), Peugeot (0 vs 1) | curl |
| Skoda în sitemap listings + images | 1 loc + 11 image hits |
| Hub-uri reale cu conținut | `/auto` 18, `/auto/targu-jiu` 4, `/auto/skoda` 6, `/auto/skoda/octavia` 6 |
| „An fabricație” UI = `2.009` | SSR HTML Skoda; cauză: `formatScalar` → `toLocaleString('ro-RO')` |
| JSON-LD `vehicleModelDate` = `2009` (corect) | SSR HTML |
| „Prima înmatriculare” = `2026-08-06` | Valoare din `attributes.registrationDate` introdusă de vânzător — **nu** bug de mapare publicare→înmatriculare în codul de afișare |

### SSR search — cauza exactă (nu mismatch de parametri)

Confirmare independentă (cod + live):

- SSR și client citesc ambele `q` / `search`.
- `getPublicBrowseListingsPage` (introdus în `f7780758`, 2026-05-19) făcea:

```ts
if (rawQ.length >= 2) {
  return { listings: [], total: 0, page };
}
```

- API rulează Postgres FTS (`ftsSearchListingIds`).

---

## Probleme confirmate

### P1 — Contor vizualizări oprit (CRITICAL)

- **Severitate:** Critical (produs)
- **Dovadă:** Chromium fără niciun request de counting; 39/38/1 în catalog
- **Cauză:** `79584c5f` + increment doar în GET detail
- **Fișiere:** `ListingDetailPageClient.tsx`, `app/api/listings/[id]/route.ts`
- **Soluție:** `POST /api/listings/[id]/view` + beacon client + GET read-only + increment atomic cu `pg_advisory_xact_lock`
- **Test:** `record-listing-view.test.ts`, `use-listing-view-beacon.test.tsx`, verificări locale 15/15 + Playwright

### P2 — Imagini blocate de robots (HIGH / SEO)

- **Severitate:** High
- **Dovadă:** robots-parser BLOCKED pentru toate UA; 100% image sitemap sub `/api/uploads/serve`
- **Cauză:** `Disallow: /api/` în `app/robots.ts` + URL-uri imagine sub `/api/`
- **Soluție:** `Allow: /api/uploads/serve` (longest-match) pentru `*`, `Googlebot`, `Googlebot-Image`; restul `/api/` rămâne blocat
- **Test:** `robots-public-media.test.ts` + robots-parser local ALLOWED/BLOCKED

### P3 — SSR search returnează zero (HIGH / SEO + UX crawler)

- **Severitate:** High
- **Dovadă:** HTML SSR 0 linkuri; API 7/7/1
- **Cauză:** early-return FTS absent în `public-browse-server.ts` (`f7780758`)
- **Soluție:** SSR folosește aceleași helpers FTS ca API
- **Test:** `public-browse-ssr-search.test.ts`; local `unique listing links=3`

### P4 — An fabricație afișat ca `2.009` (MEDIUM)

- **Severitate:** Medium
- **Dovadă:** SSR HTML `An fabricație|2.009`
- **Cauză:** `formatScalar` pe year
- **Soluție:** `pushYearRow` fără separator de mii
- **Test:** `listing-category-specs-auto-dedupe.test.ts` expect `"2017"`

### P5 — Breadcrumb fără make/model deși hub-urile există (LOW/MEDIUM, îmbunătățire justificată)

- **Severitate:** Medium (SEO internal linking)
- **Dovadă:** live trail `Acasă → Auto → Târgu Jiu`; hub-uri `/auto/skoda`, `/auto/skoda/octavia` cu conținut real
- **Soluție:** builder comun nav + JSON-LD: `Acasă → Auto → Make → Model → City → Title`
- **Test:** `listing-breadcrumbs.test.ts`; local HTML conține `/auto/skoda` + `/auto/skoda/octavia`

### P6 — Lipsă `max-image-preview:large` (LOW)

- **Severitate:** Low
- **Dovadă:** meta robots live = `index, follow` fără max-image-preview
- **Soluție:** setat în `createPageMetadata` pentru `googleBot`

---

## Probleme neconfirmate

- **Nu pot confirma acest lucru** fără Google Search Console / Bing Webmaster Tools: index coverage, impressions, clicks, canonical ales de Google, last crawl, sitemap processing.
- **Nu pot confirma acest lucru** pentru pagina OLX de comparație: `https://www.olx.ro/d/oferta/skoda-octavia-2-facelift-IDkMaol.html` a răspuns **HTTP 403** (CloudFront) la fetch controlat. Observabil public fără 403:
  - `https://www.olx.ro/robots.txt` (HTTP 200): blochează `/api/`, declară `Sitemap: https://www.olx.ro/sitemap.xml`, `Allow: /`.
- **Nu pot confirma acest lucru** că cele ~2000 vizualizări OLX (dacă există în UI) provin din Google — nu există acces public la sursa traficului.
- **Nu pot confirma acest lucru** fără loguri server/Bing: câte URL-uri IndexNow au fost acceptate recent și statusul lor de crawl. Codul IndexNow: endpoint `api.indexnow.org`, key file live HTTP 200 (32 hex), filtrează path-uri private, doar production outbound, fail-soft. Nu s-a făcut resubmit în masă.
- „Prima înmatriculare” = data publicării: **nu confirmat ca bug de cod**; câmpul `registrationDate` este input de tip `date` în formularul de publicare. Valoarea Skoda pare introdusă de vânzător.

---

## Modificări (candidat)

### Fișiere

| Fișier | Explicație |
|--------|------------|
| `app/api/listings/[id]/view/route.ts` | **NOU** — POST beacon, CSRF, rate limit, 404 non-indexable |
| `lib/listings/record-listing-view.ts` | **NOU** — increment atomic + advisory lock + analytics row |
| `lib/listings/use-listing-view-beacon.ts` | **NOU** — hook client (1 POST / listing / mount) |
| `lib/seo/listing-breadcrumbs.ts` | **NOU** — trail comun nav/JSON-LD |
| `app/api/listings/[id]/route.ts` | GET read-only (fără increment) |
| `app/listings/[id]/ListingDetailPageClient.tsx` | folosește beacon + afișează `views` autoritar |
| `lib/listing-view-count.ts` | doar guards browse/automation (nu mai consumă dedupe) |
| `lib/listings/public-browse-server.ts` | SSR FTS parity cu API |
| `app/robots.ts` | Allow precis `/api/uploads/serve` + Googlebot-Image |
| `lib/listing-category-specs.ts` | year fără locale grouping |
| `lib/seo.ts` | `max-image-preview:large` |
| `app/listings/[id]/ListingBreadcrumbsNav.tsx` | trail make/model |
| `app/listings/[id]/ListingJsonLd.tsx` | același trail |
| tests unit (7 fișiere noi/actualizate) | regresii contor/SEO/search/robots/breadcrumbs |

### Diffstat (pre-commit)

```
12 files changed, 202 insertions(+), 268 deletions(-)
+ new routes/libs/tests
```

### Out of scope (neatins)

- Prisma schema / migrări
- package.json / lockfile
- Stripe / plăți
- Auth
- Mobile app
- Moderare / publish flow

---

## Verificări

| Check | Rezultat |
|-------|----------|
| `tsc --noEmit` | PASS |
| eslint (fișiere modificate) | PASS (`--max-warnings=0`) |
| Unit tests (full suite) | **899 passed / 133 suites** |
| Unit tests (patch-relevant) | **79 passed / 10 suites** |
| `next build` | PASS (include `/api/listings/[id]/view`) |
| Local candidate HTTP (`next start` :3011) | **15/15 PASS** |
| Local Playwright Chromium beacon | PASS — exact 1× `POST /view`, 0× GET detail, counter 3→4, UI `4 vizualizări` |
| robots-parser local | image ALLOWED; `/api/listings` BLOCKED for Googlebot/Googlebot-Image/Bingbot/`*` |
| Integration / full Playwright E2E suite | Nu rulate integral (timp); verificările țintite de mai sus acoperă regresia |
| Production | **neatinsă** |

### Verificare locală — detalii

Listing de test local: `3b10792f-a3a1-4160-9f70-2547df6fc6db` (Skoda Octavia, views inițial 0).

| Test | Rezultat |
|------|----------|
| GET detail nu incrementează | 0→0 |
| POST view incrementează | counted=true, views=1 |
| Same session dedupe | counted=false, views=1 |
| New session | counted=true, views=2 |
| Bot UA | counted=false |
| 3 concurrent same session | exactly 1 increment (advisory lock) |
| SSR search `?q=Skoda` | 3 listing links în HTML |
| robots Allow serve / Disallow /api/ | present |

Server local pornit cu
`STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION=1 CLICKANUNT_E2E_SERVER=1 E2E_DISABLE_RATE_LIMIT=1`
(necesar pentru `next start` cu chei Stripe test pe localhost; nu afectează dedupe-ul pe sesiune).

---

## Siguranță

| Zonă | Status |
|------|--------|
| DB / migrări | Nicio migrare; doar `UPDATE listings.views` atomic + insert analytics |
| Prisma schema | neatins |
| package/lockfile | neatins |
| Stripe | neatins |
| Auth | neatins |
| Mobile | neatins (worktree izolat) |
| Worktree utilizator | neatins (`auto-platform` dirty state păstrat) |
| Producție | neatinsă (doar GET read-only + browser view fără side-effect pe counter — confirmat 0→0) |

---

## Candidat

| Item | Value |
|------|-------|
| Branch | `fix/listing-views-and-image-crawl-regression` |
| Parent live | `32608f1e10f409e86d8575e2d015442fa530c0e8` |
| SHA candidat | tipul branch-ului `fix/listing-views-and-image-crawl-regression` (`git rev-parse HEAD`) |
| Commits over live | 1 |
| Migrări | **NU** |
| Cloudflare change necesară? | **Nu obligatoriu din cod.** Cloudflare Managed Content din robots **nu** blochează `/api/uploads/serve`. Allow-ul aplicației ar trebui să apară după deploy în secțiunea non-Cloudflare. Verificare post-deploy cu robots-parser obligatorie. |

### Plan deploy

1. Review + approve acestui branch.
2. Merge pe linia de release folosită live (nu force-push).
3. Deploy immutable release (scripturile existente din repo).
4. Post-deploy read-only:
   - `/api/version` SHA = candidat
   - `robots.txt` conține `Allow: /api/uploads/serve` și încă `Disallow: /api/`
   - robots-parser: image ALLOWED, `/api/listings` BLOCKED
   - Chromium pe un anunț de test: exact 1× `POST /api/listings/{id}/view`, counter +1
   - refresh same session: counted=false
   - `/listings?q=Skoda` SSR HTML conține linkuri listing
5. **Nu** resubmit IndexNow în masă.
6. Purge Cloudflare cache pentru `robots.txt` dacă e cached.

### Plan rollback

1. Redeploy SHA live anterior `32608f1e`.
2. Nu există migrare de reverse.
3. Contorul revine la comportamentul înghețat (regresia veche) — acceptabil ca rollback de urgență.
4. Views deja incrementate rămân (corect istoric).

---

## READY FOR REVIEW — NOT DEPLOYED

### Final pre-deploy gate (local, not pushed)
- Trailing whitespace in this report fixed (`git diff --check` clean)
- View route hardened: `Sec-Fetch-Site: cross-site` reject, strict Origin allowlist, payload cap, explicit `Cache-Control: no-store`
- Beacon uses `fetch` + `keepalive` + CSRF/session headers (no `sendBeacon`)
- Concurrency: 20 same-session → +1; 20 diff-session → +20 (HTTP + unit)
- Playwright Chromium: direct / click / refresh / client-nav / hold-open PASS
- robots-parser: image ALLOWED; `/api/listings|/api/auth|/api/admin` BLOCKED for Googlebot, Googlebot-Image, Bingbot, `*`
