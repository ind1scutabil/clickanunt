# App Links / Universal Links

**Status:** `NOT PUBLISHED / NOT VERIFIED` — no `/.well-known/assetlinks.json` or
`apple-app-site-association` in repo yet. Signing certificate SHA-256 is only
known after the first Play App Signing / upload-key release.

## Confirmed app identity (from `apps/mobile/app.json`)

| Platform | ID |
|----------|----|
| Android package | `ro.clickanunt.mobile` |
| iOS bundle | `ro.clickanunt.mobile` |
| Custom scheme | `clickanunt://` |
| Production site | `https://www.clickanunt.ro` |

## Custom-scheme deep links (implemented in app)

| URL | Target |
|-----|--------|
| `clickanunt://listings/:id` | Listing details (after login / session restore) |
| `clickanunt://verify-email?token=…` / path token | Email verification |

Navigation prefixes also include `https://www.clickanunt.ro` and `https://clickanunt.ro`
for path `/listings/:listingId`, but **Android App Link verification is off**
(`intentFilters.autoVerify: false`) until a real signing fingerprint exists.

## Future targets (after first signed Play/App Store release)

- Android: `/.well-known/assetlinks.json` with real `sha256_cert_fingerprints`
- Apple: `/.well-known/apple-app-site-association`
- Enable `autoVerify: true` only with the published fingerprint

## Rule

Do not invent Play signing fingerprints or publish a placeholder `assetlinks.json`.
Document SHA-256 only from Play Console → App integrity / App signing.
