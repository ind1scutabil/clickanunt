# App Links / Universal Links

**Status (Android):** Digital Asset Links published for package `ro.clickanunt.mobile`
on the canonical host `https://www.clickanunt.ro`. `autoVerify` is enabled for
`https://www.clickanunt.ro/listings/*` only.

**Status (iOS):** `apple-app-site-association` is still not published.

## Confirmed app identity (from `apps/mobile/app.json`)

| Platform | ID |
|----------|----|
| Android package | `ro.clickanunt.mobile` |
| iOS bundle | `ro.clickanunt.mobile` |
| Custom scheme | `clickanunt://` |
| Production site (canonical) | `https://www.clickanunt.ro` |

## Website routes the app can open natively

| URL | Target |
|-----|--------|
| `https://www.clickanunt.ro/listings/:id` | Listing details (`ListingDetails`) |
| `clickanunt://listings/:id` | Same (custom scheme; always available) |

Website listing pages live at `app/listings/[id]`. Share/canonical URLs use
`/listings/:id` on `www.clickanunt.ro`. The mobile parser
(`apps/mobile/src/auth/listing-deep-link.ts`) accepts that path and the custom
scheme; unrelated paths (privacy, hub pages, etc.) are not claimed by App Links.

## Host choice

- **Declared for App Links:** `www.clickanunt.ro` only.
- **Not declared:** apex `clickanunt.ro` — it 301-redirects to `www`, and Android
  App Link verification requires a direct 200 JSON response on each declared host
  (redirect alone is not enough).

## Play App Signing fingerprints in `assetlinks.json`

Source: Google Play Console → Play App Signing (user-provided, Internal Testing).
Upload key is intentionally excluded.

| Key | SHA-256 | Why included |
|-----|---------|--------------|
| Current classical | `B4:F5:EA:F7:…:8B:35:87` | Signs APKs for current classical / hybrid classical path |
| Previous Play App Signing classical | `F5:5A:93:FC:…:61:3C:78` | Still valid for installs/updates that retain the prior classical signer |
| Post-quantum (ML-DSA) | `CD:B3:DC:6C:…:AE:A1:A6` | Required by [Play App Signing quantum-ready guidance](https://support.google.com/googleplay/android-developer/answer/9842756): hybrid signing uses three distinct keys; register all three with API providers / `assetlinks.json` |

No device with the Play-distributed APK was connected via `adb` in this session, so
`apksigner verify --print-certs` was not run locally. Fingerprints come from Play
Console App Signing only.

File: `public/.well-known/assetlinks.json`

## Rule

Do not invent Play signing fingerprints. Do not add the upload key. Re-verify
fingerprints in Play Console before any signing-key upgrade.
