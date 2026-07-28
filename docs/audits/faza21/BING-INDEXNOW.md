# Bing Webmaster Tools & IndexNow

## Important

**IndexNow is not a Google protocol.** Do not claim Google indexing via IndexNow.

## Bing Webmaster Tools (manual)

1. Create a Bing Webmaster property for `https://www.clickanunt.ro`.
2. Verify (meta `msvalidate.01` via `NEXT_PUBLIC_BING_SITE_VERIFICATION`, or DNS/XML).
3. Submit the same sitemap set as GSC.

## IndexNow (code ready, key optional)

Env:

- `INDEXNOW_KEY` — random ≥8 chars; not committed.

Endpoints:

- Key file: `GET /indexnow-key.txt` → plain key or 404 if unset.
- Client: `lib/seo/indexnow-client.ts` → `submitIndexNow` / `enqueueIndexNowSafe`.

Eligible URLs only: https + canonical host + no query + not admin/dashboard/auth/api/edit/promote.

Statuses: `accepted` | `rate_limited` | `failed` | `not_configured` | `skipped_ineligible`.

Publish hooks may call `enqueueIndexNowSafe` — failures never block listing publish.
