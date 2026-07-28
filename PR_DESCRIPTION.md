# SEO: footer dinamic, hub-uri categorie×oraș cu fallback DB, /about extins

> Branch: `feat/category-price-and-salary-model` · Bază de comparație: HEAD curent (`3c376eff`,
> commit-ul live în producție) — **nu** `main` local (vezi nota din secțiunea Diff, `main` a
> divergent semnificativ și nu e o bază de comparație utilă pentru acest PR).

## Rezumat

Set de 5 îmbunătățiri SEO/tehnice pe baza unui audit extern pe clickanunt.ro. Nu s-a modificat
structura bazei de date și nu s-a șters/modificat niciun anunț existent.

1. **Footer complet** — categoriile din footer vin acum din `TAXONOMY` (sursa unică folosită și
   de meniu/sitemap), toate cele 12, sortate alfabetic — nu mai sunt hardcodate 3. Secțiunea
   "Orașe" afișează dinamic top 10 orașe sitewide cu ≥1 anunț activ, ordonate descrescător după
   număr de anunțuri, în loc de un singur oraș hardcodat.
2. **Hub-uri categorie×oraș — fix fallback DB** — rutele `/[categorie]/[oraș]` erau deja generate
   dinamic pentru orice combinație cu ≥1 anunț activ (nu era hardcodare, cum sugera auditul), dar
   rezolvarea slug→nume oraș depindea de o listă statică. Am adăugat un fallback pe `Listing.city`
   real din DB pentru orașe din afara listei statice (câmpul `city` e text liber la nivel de
   schema/validare), ca hub-urile pentru astfel de orașe să nu mai dea 404 permanent.
3. **JSON-LD (Schema.org)** — verificat, deja implementat corect: `Product`+`Offer` pe
   `/listings/[id]`, `Organization`+`WebSite` (cu `SearchAction`) pe homepage, `BreadcrumbList` pe
   categorie/hub. Nicio schimbare de cod necesară pentru acest task.
4. **`/about` extins** — secțiune nouă "Identitate companie" (denumire legală, CUI/CIF, sediu
   social, data lansării), reutilizând `CompanyDetailsBox` existent; câmpurile lipsă au
   placeholder + `TODO` în `lib/company-config.ts` pentru echipa non-tehnică.
5. **Analytics** — confirmat GA4 (`NEXT_PUBLIC_GA_ID=G-C0F3DZEDPG`), încărcare pe toate rutele prin
   layout root, gating corect prin cookie consent. Nicio schimbare de cod.

## Diff real față de HEAD (11 fișiere)

```
 app/[categorySlug]/[citySlug]/page.tsx    |  10 +-
 app/about/page.tsx                        |  16 +++
 app/auto/[makeSlug]/page.tsx              |   6 +-
 app/components/Footer.tsx                 |  12 +-
 app/layout.tsx                            |   6 +-
 lib/company-config.ts                     |   6 +
 lib/company-public.ts                     |  14 ++
 lib/seo/auto-hub-resolve.ts               |  29 ++
 lib/seo/footer-indexable-links.ts         | 114 +++++----
 lib/seo/hub-queries.ts                    |  66 +++++
 tests/unit/footer-indexable-links.test.ts |  66 +++--
 11 files changed, 253 insertions(+), 92 deletions(-)
```

Plus 2 fișiere de test noi: `tests/unit/company-public.test.ts`, `tests/unit/hub-city-db-fallback.test.ts`.

Notă din sanity-check-ul redenumirii `cityHubs`→`cities`/`cityHubLinks`→`cityLinks`: afectează
doar `Footer.tsx` + `layout.tsx` (100% mecanic, verificat linie cu linie) + `footer-indexable-links.ts`
și fișierul de test aferent (aici redenumirea e doar o parte din rescrierea funcțională de la
Task 1, nu o redenumire pură). Restul fișierelor din diff sunt schimbări funcționale distincte
(fallback DB oraș, `/about`), fără legătură cu redenumirea.

## Rezultatele verificării pre-deploy

- **Unit tests:** 821/822 — 1 eșec (`listing-publish-rate-limit.test.ts`), **confirmat pre-existent**
  rulând pe un worktree curat la HEAD (fără schimbările din acest PR): eșuează identic acolo.
- **Build de producție:** `npm run build` ✅ succes.
- **Smoke manual pe build de producție local** (`next start`, port dedicat), 5/5 scenarii ✅:
  - Homepage: footer afișează toate cele 12 categorii + top orașe.
  - Hub ≥ prag (`electronice/cluj-napoca`, 238 anunțuri): 200, `robots: index, follow`.
  - Hub sub prag (`auto/onesti`, 1 anunț): 200, `robots: noindex, follow`.
  - Oraș nou, în afara listei statice (anunț temporar creat/șters în test): fallback DB
    funcțional în build de producție (200, nume oraș randat corect).
  - `/about` cu `NEXT_PUBLIC_SHOW_COMPANY_LEGAL_DETAILS` necompletat: 200, fără erori, fallback
    corect afișat.
- **E2E (Playwright), read-only, pe build de producție:** 34/35 (`smoke.spec.ts`,
  `predeploy-ui-smoke.spec.ts`, `routes-and-errors.spec.ts`, chromium) — singurul eșec e
  pre-existent și neafectat de acest PR (vezi risc #2 mai jos).
- **Integration tests:** rulate, dar nu acoperă footer/hub/`/about`; eșecurile existente sunt de
  mediu local (CSRF/auth), neafectate de acest PR.

## Riscuri cunoscute, non-blocante

1. **`listing-publish-rate-limit.test.ts` roșu pre-existent** — confirmat că eșuează și pe HEAD
   fără schimbările din acest PR. Vezi `docs/known-issues.md` #1 pentru detalii/reproducere.
2. **Bug hidratare `/auth/login`** — al doilea nod DOM `input[type="email"]` apare doar
   client-side/post-hidratare (SSR are un singur nod); confirmat fără legătură cu acest PR.
   Vezi `docs/known-issues.md` #2.
3. **Zero acoperire e2e dedicată pe footer/hub-uri categorie×oraș/`/about`** — testele Playwright
   existente ating footer-ul doar superficial (vizibilitate, buton cookie settings) și nu au
   specs dedicate pentru rutele `/{categorie}/{oraș}` sau `/about`. Riscul de regresie pe aceste
   zone se bazează pe unit tests + smoke manual, nu pe e2e automat.
4. **Risc de cache pe orașe noi** — fallback-ul DB pentru hub-uri (`resolveCityLabelForHub` în
   `lib/seo/hub-queries.ts`) e cache-uit 5 minute (`revalidate: 300`). Un anunț publicat într-un
   oraș complet nou poate avea hub-ul indisponibil (404) până la expirarea cache-ului sau un
   restart de server. Comentat direct în cod pentru echipa de suport.

---

*Notă: acest fișier documentează starea PR-ului la finalul verificării pre-deploy. Nu este marcat
ready-to-merge — decizia finală de merge/deploy rămâne manuală.*
