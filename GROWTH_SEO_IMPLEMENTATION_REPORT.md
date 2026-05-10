# Growth SEO — raport implementare (ClickAnunț)

## Rezumat

- **Google Analytics 4** și **Microsoft Clarity**: încărcare doar în **producție**, doar dacă există variabilele `NEXT_PUBLIC_*`.
- **Imagini Open Graph dinamice** (Next.js App Router): home, categorie, categorie+oraș, anunț.
- **Schema.org** pe anunț: `Product` + `Offer` (disponibilitate, valută, imagini, vânzător public, condiție) + `BreadcrumbList` (fără duplicate între blocuri).
- **Breadcrumbs** vizibile + JSON-LD: home, hub categorie, hub oraș, detaliu anunț.
- **Hub-uri SEO**: bloc FAQ + `FAQPage` JSON-LD când pagina are conținut indexabil (`count > 0`).
- **Import**: șablon CSV + ghid (fără scraping, fără publicare automată).
- **Trust**: helperi pentru scor euristic și cuvinte cheie (fără blocare utilizatori).

## Fișiere modificate / adăugate

### Analytics

- `app/components/analytics/GoogleAnalytics.tsx` (nou)
- `app/components/analytics/MicrosoftClarity.tsx` (nou)
- `app/layout.tsx` — include componentele de mai sus

### Open Graph

- `lib/seo/marketplace-og.tsx` (nou) — layout comun 1200×630
- `app/opengraph-image.tsx` (nou)
- `app/[categorySlug]/opengraph-image.tsx` (nou)
- `app/[categorySlug]/[citySlug]/opengraph-image.tsx` (nou)
- `app/listings/[id]/opengraph-image.tsx` (nou, `runtime: nodejs`, Prisma)
- `app/layout.tsx`, `app/page.tsx` — referință OG default `/opengraph-image`
- `app/listings/[id]/layout.tsx` — `ogImage` către `/listings/[id]/opengraph-image`
- `app/[categorySlug]/page.tsx`, `app/[categorySlug]/[citySlug]/page.tsx` — `ogImage` în metadata

### Schema / breadcrumbs / FAQ

- `lib/seo/listing-seo-eligibility.ts` — `listingSchemaAvailabilityUrl`
- `lib/seo.ts` — `generateFaqPageStructuredData`
- `lib/seo/market-hub-faq.ts` (nou)
- `app/listings/[id]/ListingJsonLd.tsx` — îmbunătățiri Product/Offer, imagini, vânzător, `itemCondition`
- `app/listings/[id]/ListingBreadcrumbsNav.tsx` (nou)
- `app/listings/[id]/layout.tsx` — include breadcrumbs server
- `app/components/seo/SeoMarketHubExtras.tsx` — FAQ vizibil + script FAQ JSON-LD
- `app/[categorySlug]/page.tsx`, `app/[categorySlug]/[citySlug]/page.tsx` — FAQ + FAQPage LD
- `app/page.tsx`, `app/components/HomePageClient.tsx` — breadcrumb home + JSON-LD

### Import & trust

- `docs/import-listings-template.csv` (nou)
- `docs/IMPORT_LISTINGS_GUIDE.md` (nou)
- `lib/trust/listingTrust.ts` (nou)
- `docs/TRUST_AND_ANTI_SPAM_PLAN.md` (nou)

## Variabile de mediu

| Variabilă | Rol |
|-----------|-----|
| `NEXT_PUBLIC_GA_ID` | ID GA4 (ex. `G-XXXX`). Lipsește → fără GA. |
| `NEXT_PUBLIC_CLARITY_ID` | Proiect Clarity. Lipsește → fără Clarity. |

**Producție:** setați și `NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro` (deja recomandat pentru canonical / sitemap).

## Pași configurare GA4

1. Creați proprietate **Google Analytics 4** și flux **Web**.
2. Copiați **Measurement ID** (`G-…`).
3. În hosting: `NEXT_PUBLIC_GA_ID=G-…` și redeploy.
4. (GDPR) Conectați banner-ul de consimțământ la `gtag('consent', …)` conform politicii legale.

## Pași configurare Clarity

1. Creați proiect în **Microsoft Clarity**, copiați **Project ID**.
2. `NEXT_PUBLIC_CLARITY_ID=…` și redeploy.

## URL-uri de test (după deploy)

- OG home: `https://www.clickanunt.ro/opengraph-image`
- OG categorie: `https://www.clickanunt.ro/auto/opengraph-image`
- OG oraș: `https://www.clickanunt.ro/auto/bucuresti/opengraph-image`
- OG anunț: `https://www.clickanunt.ro/listings/<id>/opengraph-image`
- Pagini: `/`, `/auto`, `/auto/bucuresti`, `/listings/<id>`
- Sitemap / robots: neschimbate în acest layer (verificați în continuare în GSC)

## Recomandări rămase

- Conectare CMP pentru consent înainte de a crește traficul plătit.
- Monitorizare Search Console pentru erori de îmbogățire Product/Offer.
- Cozi admin pentru `listingTrust` (afișare scor, nu decizie automată).
