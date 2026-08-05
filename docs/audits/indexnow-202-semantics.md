# IndexNow HTTP 202 — semnificație (FAZA listing-cards + IndexNow)

**Data:** 2026-08-05  
**Context:** backfill manual `scripts/indexnow-submit-all.mjs` + client `lib/seo/indexnow-client.ts`

## Ce înseamnă 202

Răspunsul **HTTP 202 Accepted** (sau 200) de la `https://api.indexnow.org/indexnow` înseamnă doar că IndexNow a **acceptat lista de URL-uri pentru procesare** de către motoarele participante (ex. Bing, Yandex).

**Nu înseamnă:**
- că URL-ul este deja indexat în Bing Webmaster Tools;
- că va apărea în rezultatele de căutare;
- că Google a fost notificat (Google **nu** folosește IndexNow).

Verificarea indexării reale rămâne în Bing Webmaster / Search Console, pe timeframe-ul organic al motorului.

## Backfill 69 URL-uri

Scriptul de backfill **nu** rulează la pornirea aplicației (PM2/`next start`). Se lansează manual:

```bash
INDEXNOW_KEY=… node scripts/indexnow-submit-all.mjs [--dry-run]
```

Un dry-run anterior pe sitemap-urile live a raportat **69** URL-uri eligibile. Orice 202 observat la acel backfill este documentat aici ca **acceptare pentru procesare**, nu ca dovadă de indexare.
