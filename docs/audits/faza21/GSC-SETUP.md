# Google Search Console — setup for ClickAnunț

**Status:** `NOT_CONFIGURED` on production as of FAZA 21 audit (no verification env / no service account).

## Manual steps (owner)

1. Create a **Domain** property for `clickanunt.ro` in Google Search Console.
2. Verify via **DNS TXT** (preferred for domain property) or keep HTML file/`meta` verification.
3. Submit sitemaps:
   - `https://www.clickanunt.ro/sitemap.xml`
   - `https://www.clickanunt.ro/sitemap-categories.xml`
   - `https://www.clickanunt.ro/sitemap-cities.xml`
   - `https://www.clickanunt.ro/sitemap-listings.xml`
   - `https://www.clickanunt.ro/sitemap-auto-hubs.xml`
   - `https://www.clickanunt.ro/sitemap-images.xml`
4. Optional API (admin dashboard):
   - Create a Google Cloud service account with Search Console access.
   - Add the service account email as a user on the GSC property (least privilege).
   - Set secrets (never commit):
     - `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
     - `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`
     - `GOOGLE_SEARCH_CONSOLE_SITE_URL` (e.g. `sc-domain:clickanunt.ro`)
     - optional `GSC_BRANDED_QUERY_REGEX`
5. Also set site verification if using meta tag:
   - `GOOGLE_SITE_VERIFICATION` or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
6. Smoke: open `/admin/seo` as admin — status must leave `NOT_CONFIGURED` only after secrets exist; metrics appear only after approved live API enablement.
7. Revoke service-account access when rotating credentials.

## Adapter behaviour

`lib/seo/search-console-client.ts` is **fail-closed**:

- missing secrets → `not_configured` (no network);
- secrets present without approved live enablement → explicit error (no invented rows);
- never returns demo clicks/impressions.
