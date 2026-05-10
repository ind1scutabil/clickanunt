# SEO — checklist final pentru ClickAnunț (deploy producție)

Acest ghid sintetizează fundația SEO livrată: domeniu canonic **https://www.clickanunt.ro**, sitemap-uri scalabile, robots, hub-uri `/categorie` și `/categorie/oras`, metadata listing, JSON-LD fără dublaje inutile, linkuri interne și verificare Search Console / Bing.

## Variabile de mediu obligatorii / recomandate

| Variabilă | Obligatoriu | Rol |
|-----------|-------------|-----|
| `NEXT_PUBLIC_SITE_URL` | **Da (producție)** | Origin canonic pentru `metadataBase`, OG, canonical, sitemap-uri, JSON-LD. Valoare: `https://www.clickanunt.ro` |
| `GOOGLE_SITE_VERIFICATION` | Opțional | Meta tag verification Google (preferat server-side); alternativ poți folosi și `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Opțional | Bing Webmaster (`msvalidate.01`), doar dacă este setat |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Opțional | Alternativ pentru Google dacă nu folosești varianta server |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | Opțional | Yandex |

Dacă `NEXT_PUBLIC_SITE_URL` lipsește în producție, aplicația **nu cade**, dar apare un **warning în log** și se folosește fallback-ul `https://www.clickanunt.ro` în `siteOrigin()` (nu localhost).

### Cloudflare DNS — verificare Google (TXT)

1. În [Google Search Console](https://search.google.com/search-console): **Add property** pentru `https://www.clickanunt.ro` sau domeniu `clickanunt.ro`.
2. Alege verificarea **DNS TXT**.
3. În Cloudflare: **DNS** → **Add record**: Type **TXT**, Name `@` sau `www` (în funcție de instrucțiunile Google pentru tipul de proprietate), Content valoarea `google-site-verification=…`.
4. După propagare (de obicei câteva minute), finalizează verificarea în Search Console.

### Bing Webmaster Tools

1. Adaugă site-ul și urmează instrucțiunea pentru **meta tag** sau **TXT DNS** similar.
2. Dacă folosești meta: setezi `NEXT_PUBLIC_BING_SITE_VERIFICATION`; layout-ul emite automat `msvalidate.01`.

## Fișiere cheie modificate sau adăugate (arhitectură SEO)

- `lib/site-url.ts` — origin + `absoluteUrl`; documentare env.
- `lib/seo/site-url-guard.ts` — warning în producție când lipsește `NEXT_PUBLIC_SITE_URL`.
- `lib/seo/hub-queries.ts` — cache `count` / preview pentru hub-uri.
- `lib/seo/sitemap-queries.ts` — sitemap categorii + orașe din **DB** (fără perechi goale).
- `lib/seo/market-paths.ts` — intro național, orașe „surori”, categorii înrudite; reserved slugs și duplicate `sitemap.xml` rezolvate.
- `lib/seo/listing-seo-eligibility.ts` — reguli `noindex` + Product JSON-LD doar dacă listing-ul e eligibil SEO.
- `lib/seo.ts` — **ItemList** JSON-LD.
- `app/layout.tsx` — `metadataBase`, verificări SEO, `warnIfProductionSiteUrlMissing()` în RootLayout.
- `app/components/seo/GlobalJsonLd.tsx` — **Organization + WebSite** (+ SearchAction în WebSite).
- `app/components/seo/SeoMarketHubExtras.tsx` — breadcrumbs vizuali + orașe / categorii înrudite.
- `app/[categorySlug]/page.tsx` — **pagină stâlp** `/auto`, `/imobiliare`, …
- `app/[categorySlug]/[citySlug]/page.tsx` — hub categorie + oraș, `noindex` dacă 0 anunțuri, breadcrumbs + ItemList.
- `app/sitemap.ts`, `app/sitemap-serve/*`, `app/robots.ts` — domeniu canonic și reguli disallow.
- `app/listings/[id]/layout.tsx`, `ListingJsonLd.tsx` — titlu/preț/OG, `noindex` pentru liste neeligible, breadcrumbs îmbogățite.
- `app/components/HomePageClient.tsx`, `app/components/Footer.tsx` — linkuri interne spre pillar și hub-uri `/auto/:oras`.
- `SEO_FINAL_DEPLOYMENT_CHECKLIST.md` — acest fișier.

## Rute importante (test după deploy)

| Tip | URL exemplu |
|-----|----------------|
| Pillar categorie | `https://www.clickanunt.ro/auto` |
| Hub categorie + oraș | `https://www.clickanunt.ro/electronice/cluj-napoca` |
| Alias (redirect 308 către canon) | `https://www.clickanunt.ro/telefoane` → `/electronice` |
| Listing | `https://www.clickanunt.ro/listings/{uuid}` |

## Sitemap-uri (nume exacte pentru submit)

Introdu în **Search Console → Sitemaps** ( și Bing dacă aplică):

- `https://www.clickanunt.ro/sitemap.xml`
- `https://www.clickanunt.ro/sitemap-categories.xml`
- `https://www.clickanunt.ro/sitemap-cities.xml`
- `https://www.clickanunt.ro/sitemap-listings.xml`

Notă: `/sitemap-listings.xml` este un **sitemap index** care indică shards `sitemap-listings-0.xml`, `sitemap-listings-1.xml`, … până la **max. 45.000 URL-uri per shard**.

## robots.txt — reguli (rezumat)

- **Allow**: pagini publice (`/`, `/listings/`, `/about`, `/contact`, `/business`, `/security`).
- **Disallow**: `/api/`, `/admin/`, `/dashboard/`, `/account/`, `/auth/`, `/login/`, `/register/`, `/messages/`, căi de edit/promote/messages pentru listing-uri, `_next`, zone demo (`/ui-demo`, …).
- **Sitemap-uri**: toate cele de mai sus, plus host canonic derivat din `siteOrigin()`.

Hub-urile fără anunțuri active primesc **`noindex`** în metadata și **nu sunt generate** în sitemap-uri (doar din `groupBy` pe listing-uri active și `deletedAt: null`).

## Comenzi de deploy și verificare locală CI

În repo:

```bash
npm run type-check
npm run lint
NODE_ENV=production npm run build
```

(Scriptul `npm run type-check` este echivalent pentru cerința „typecheck”. Nu există `npm run typecheck`.)

După deploy pe VPS/scripturile tale existente (`npm run deploy:prod`, etc.), validezi manual URL-urile din tabel și răspunsurile XML pentru sitemap-uri (status 200, `Content-Type: application/xml`).

## Limitări cunoscute

- **Moderare**: `Product` JSON-LD și indexarea canonical pentru detaliu listing apar **doar** dacă listing-ul este `active`, `deletedAt == null`, `moderationStatus == approved`, neexpirat (`expiresAt` în viitor sau null). Conținutul poate fi încă vizibil pentru unele stări în UI; crawlerii primesc `noindex` dacă nu e eligibil.
- **`/electronice`** este slug-ul canonic pentru telefoane / electrocasnice; alias-ul `/telefoane` redirecționează către canon.
- **Imagini Mare**: recomandată verificarea suplimentară LCP pentru pagina listing (client component existentă); nimic în acest rollout nu degradează intenționat SSR pentru hub-uri (server components).

## Următori pași pentru trafic

1. Trimite cele 4 sitemap-uri către Search Console și Bing.
2. Monitorizează **Coverage** pentru „Excluded by noindex” pe hub-uri goale — așteptat.
3. Construiește conținut editorial (/ghid-uri) și backlinks locale fără a crește masa de hub-uri goale în index.
4. Optimizează titlurile CTR pe baza căutărilor în **Search Console → Performance**.

---

**Fișiere modificate în acest ciclu SEO:** vezi istoricul Git și secțiunea „Fișiere cheie” de mai sus. **Comenzi deploy:** acelea definite în `package.json` / scripturile `scripts/deploy-*.sh` ale proiectului. **URL-uri de test:** secțiunea „Rute importante”. **Nume sitemap-uri de înregistrat:** secțiunea „Sitemap-uri”.
