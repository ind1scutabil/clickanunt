# FAZA 21 — Google visibility, SEO distribution & acquisition foundation

**Date:** 2026-07-28 (UTC)  
**Branch:** `feat/category-price-and-salary-model`  
**Local HEAD (this phase):** pending commit after gates  
**Live SHA (verified read-only):** `f753f9d3287e35e00a4a7670465578b14519d4ad`  
**Live release:** `/var/www/clickanunt-releases/20260728T110135Z-f753f9d3`  
**Deploy in this phase:** **NONE** (STOP for review)

## A. Verdict

**FOUNDATION READY FOR REVIEW — NOT DEPLOYED**

Platforma are fundație tehnică măsurabilă și crawlabilă extinsă (admin SEO, IndexNow fail-closed, GSC adapter fail-closed, image sitemap, hub policy helper, GA4 event catalog, share UTM).  
**Nu** declarăm „SEO complet”, indexare garantată sau vizibilitate maximă.

## B. Baseline

| Item | Valoare |
|------|---------|
| Branch | `feat/category-price-and-salary-model` |
| Local = remote before work | `7ba3aa95` (docs after hotfix) |
| Live | `f753f9d3` · BUILD `1Ri2bwvg3Ox6S9WWAv5mf` · PM2 online |
| Tree | curat la start |
| Lint / tsc / unit / prisma / build | PASS (778 unit după adăugiri) |
| Migrări | **niciuna** |
| Deploy / DNS / producție write | **nu** |

## C. Investigație live (CONFIRMAT LIVE)

| URL | status | canonical | robots | JSON-LD | sitemap | indexabil | problemă | sev | fix | test |
|-----|--------|-----------|--------|---------|---------|-----------|----------|-----|-----|------|
| `/` | 200 | www | index | Org+WebSite+BC | static | da | — | — | — | live |
| `/listings` | 200 | self | index | CollectionPage | static | da | — | — | — | live |
| `/listings?page=2` | 200 | `?page=2` | index | CollectionPage | nu | da | paginare OK | — | — | live |
| `/listings?q=peugeot` | 200 | cu q | **noindex** | fără Collection | nu | nu | corect | — | — | live |
| `/listings?sort=price_asc` | 200 | `/listings` | index | CollectionPage | nu | via canonical | sort nu în sitemap | P3 | OK | live |
| `/auto` | 200 | self | index | Collection+FAQ | categories | da | — | — | — | live |
| listing Auto Peugeot | 200 | self | index | Product+Car | listings shard | da | price 10.290 | — | — | live |
| listing non-Auto teren | 200 | self | index | BC only (no Product) | listings | da | omit comercial posibil | P3 | policy | live |
| `/auth/login` | 200 | — | noindex,nofollow | — | nu | nu | — | — | — | live |
| `/dashboard` `/admin/dashboard` | 200 | — | noindex,nofollow | shell | nu | nu | HTML shell | P3 | preexistent | live |
| 404 dummy | 404 | — | noindex | — | nu | nu | — | — | — | live |
| Origin `robots.txt` | 200 | — | Allow `/`, Disallow `/api` | — | listează sitemaps | — | CF wrap pe edge public | P2 | doc | live |
| Public CF `robots.txt` | 200 | — | Content-Signals overlay | — | — | — | maschează origin robots | P2 | monitor | live |
| `sitemap.xml` | 200 | — | — | — | 15 static | — | lastmod era „now” | P2 | fix SEO_STATIC_LASTMOD | code |
| `sitemap-listings.xml` | 200 | — | — | — | index→chunk | — | OK | — | — | live |
| `sitemap-auto-hubs.xml` | 200 | — | — | — | 0 URL | — | inventar sub prag | P3 | thresholds | live |
| `/auto-moto-si-ambarcatuni` | 404 | — | noindex | — | nu | nu | slug greșit; canonic `/auto` | — | — | live |

**Env live (names only):** `NEXT_PUBLIC_GA_ID`, SMTP_* present; **no** GSC verification / Bing verification / IndexNow key.

## D. Search Console

| | |
|--|--|
| Status | **NOT_CONFIGURED** |
| Code | `lib/seo/search-console-client.ts` + `/api/admin/seo/search-console` |
| UI | Admin SEO shows factual „date indisponibile” |
| Docs | `docs/audits/faza21/GSC-SETUP.md` |
| Class | IMPLEMENTATĂ, DAR NECONFIGURATĂ |

## E. Sitemap

| | |
|--|--|
| Existing | static + categories + cities + listings chunks + auto-hubs |
| Added | **image sitemap** `/sitemap-images.xml` (+ shards) |
| Robots | updated to list images |
| lastmod static | no longer forced to `new Date()` unless `SEO_STATIC_LASTMOD` |
| Tests | contract tests in `faza21-seo-foundation.test.ts` |

## F. Robots

Origin Next robots: Allow `/`, Disallow `/api` only (so noindex HTML can be fetched).  
**CONFIRMAT LIVE:** Cloudflare may serve Content-Signals wrapper on the public edge — origin remains correct on `:3000`.

## G. Structured data

Existing builders kept. Added `lib/seo/jsonld-quality-gate.ts` (local contract; **not** Google Rich Results Test).  
Non-Auto listing without Product Offer: **CONFIRMAT LIVE** — likely policy omit; not invented.

## H. GA4

| | |
|--|--|
| Loader | consent-gated `ConditionalAnalytics` / `NEXT_PUBLIC_GA_ID` |
| Catalog | `lib/seo/marketplace-ga4-events.ts` |
| Share | `share_clicked` wired on listing share |
| Class | GA **CONFIGURATĂ** (ID present) · event catalog **IMPLEMENTAT** · funnel completeness **PARTIAL** |

## I. Bing / IndexNow

| | |
|--|--|
| Bing meta | **NOT_CONFIGURED** live |
| IndexNow | client + `/indexnow-key.txt` · fail-closed without `INDEXNOW_KEY` |
| Docs | `BING-INDEXNOW.md` |
| Class | IMPLEMENTATĂ, DAR NECONFIGURATĂ |

## J. Image SEO

Image sitemap added for indexable listings only (max 10 images/listing). Formats JPEG/PNG/WebP policy unchanged. HEIC not added.

## K. Hubs categorie/localitate

Policy helper `lib/seo/hub-indexability.ts` with configurable env thresholds. Existing hub pages + `MIN_INDEXABLE_HUB_LISTINGS=3` preserved. Auto hubs sitemap empty live → under threshold (**CONFIRMAT LIVE**).

## L. Pagination / filters

`?page=` crawlable; `q` noindex; sort canonicalizes to `/listings`. **CONFIRMAT LIVE**.

## M. Share

Web Share + WhatsApp + Facebook + Copy already existed; now use canonical share URLs + UTM + `share_clicked` (no PII).

## N. Saved searches

**MISSING model** — design only (`SAVED-SEARCHES.md`). **No migration.**

## O. Business feeds

Design only (`BUSINESS-FEEDS.md`). **No production activation.**

## P. Google Jobs

Audit doc (`GOOGLE-JOBS.md`). JobPosting path exists in code; Indexing API **OUT OF SCOPE**.

## Q. Merchant Center

Feasibility only (`MERCHANT-CENTER-FEASIBILITY.md`). **Not connected.**

## R. App links

**NOT PUBLISHED / NOT VERIFIED** (`APP-LINKS.md`).

## S. Securitate / privacy

- Admin SEO API: `ANALYTICS_VIEW` gate (401/403)
- No secrets in responses
- GA sanitizer strips email/phone/token/userId
- No Stripe / email / SMS / push / DNS / deploy

## T. Defecte confirmate

| ID | Sev | Simptom | Cauză | Stare |
|----|-----|---------|-------|-------|
| SEO-CF-ROBOTS | P2 | Public robots CF wrapper | Cloudflare Content-Signals | DOCUMENTED |
| SEO-GSC-MISS | P2 | No GSC verification/API | env missing | CONFIGURATION REQUIRED |
| SEO-STATIC-LASTMOD | P2 | Static sitemap lastmod=now | `new Date()` | FIXED in code (not deployed) |
| SEO-AUTO-HUBS-EMPTY | P3 | 0 auto-hub URLs | under threshold / inventory | EXPECTED |
| SEO-NONAUTO-NO-PRODUCT | P3 | Teren fără Product LD | policy omit | NECONFIRMAT intent — leave |
| SEO-ADMIN-SHELL | P3 | admin HTML 200 anon | client auth | PREEXISTENT |

## U. Remedieri (cod, nedeployat)

- Admin `/admin/seo` + APIs  
- IndexNow client + key route  
- GSC adapter fail-closed  
- Image sitemap  
- Hub indexability helper  
- GA4 marketplace catalog + share wiring  
- JSON-LD quality gate  
- Static sitemap lastmod policy  
- Docs package under `docs/audits/faza21/`

## V. Teste

- lint / type-check / unit (778) / prisma validate / build / `git diff --check` — PASS  
- New unit: IndexNow, GSC not_configured, GA sanitizer, JSON-LD gate, share URL, hub policy, robots/sitemap contracts  
- E2E dedicated-port full matrix: **PARTIAL / deferred to post-review** (no production mutation; gates unit+build green)

## W. Fișiere cheie

`lib/seo/integration-status.ts`, `search-console-client.ts`, `indexnow-client.ts`, `marketplace-ga4-events.ts`, `jsonld-quality-gate.ts`, `share-url.ts`, `hub-indexability.ts`, `seo-admin-status.ts`, `app/admin/seo/page.tsx`, `app/api/admin/seo/*`, `app/indexnow-key.txt/route.ts`, `app/sitemap-serve/images*`, `app/robots.ts`, `app/sitemap.ts`, `next.config.ts`, tests + docs.

## X. Migrare

**Niciuna.** Saved searches / business feed need approval before schema.

## Y. Git / PR

Commit + push pe branch (fără merge, fără amend/rebase/force, fără schimbare PR base). **Fără deploy.**

## Z. Probleme rămase / STOP

1. Owner: configure GSC Domain + DNS + optional service account  
2. Owner: optional `INDEXNOW_KEY` + Bing verification  
3. Review Cloudflare robots overlay  
4. Approve deploy of this foundation  
5. Approve any future migration for saved searches  
6. Do not enable Merchant Center / Indexing API without separate approval  

**STOP FOR REVIEW — NO DEPLOY.**
