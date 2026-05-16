# Load test profiles (Phase 3C)

Read-only HTTP load. **No writes**, no payments, no promotions purchases.

## Safety

- `BASE_URL` required (staging or local)
- Production (`clickanunt.ro`) blocked unless `ALLOW_PROD_LOAD=1` or `ALLOW_PROD_LOAD_TEST=1`
- Authenticated profiles: `LOAD_ALLOW_STAGING=1` + `LOAD_AUTH_BEARER` or `LOAD_AUTH_COOKIE`
- SSE: `LOAD_SSE_HOLD_SEC`, `LOAD_SSE_CONNECTIONS`

## Profiles

| Script | Target |
|--------|--------|
| `homepage.mjs` | `GET /` |
| `listings-page.mjs` | `GET /listings` |
| `search.mjs` | `GET /api/listings?q=` |
| `listing.mjs` | `GET /listings/:id` (`LOAD_LISTING_ID`) |
| `listing-images.mjs` | Listing HTML + first image |
| `dashboard.mjs` | `GET /api/dashboard/stats` (auth) |
| `messaging.mjs` | `GET /api/messages/conversations` (auth) |
| `sse.mjs` | `GET /api/messages/events?token=` (auth, hold) |
| `payments-readonly.mjs` | promotion-packages, stripe-publishable-key |
| `run-all-profiles.mjs` | Runs public set (+ auth if configured) |

## Env

```bash
BASE_URL=http://localhost:3000
LOAD_CONCURRENCY=10
LOAD_DURATION_SEC=15
LOAD_LISTING_ID=<uuid>          # listing + listing-images
LOAD_SAMPLE_PID=<node-pid>      # optional CPU/RSS samples
LOAD_WRITE_RESULTS=1            # write JSON under scripts/load/results/
```

## Examples

```bash
BASE_URL=http://localhost:3000 npm run load:homepage
BASE_URL=http://localhost:3000 LOAD_LISTING_ID=... npm run load:listing
BASE_URL=http://localhost:3000 npm run load:run-all
npm run load:static-analysis
```
