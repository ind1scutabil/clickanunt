# Business feed / import — design (no production activation)

**Status:** Marketing page exists; **no** secure import/feed API.

## Proposed formats

CSV / XML / JSON API with fields: externalId, title, description, category, priceType, priceAmount, currency, location, images, Auto attributes, availability.

## Security requirements before activation

API key hash, per-business scope, rate limit, max batch, MIME allowlist, SSRF protection for image URLs, schema validation, audit, idempotency, dry-run, preview, rollback.

**STOP:** Do not enable automatic import on production in this phase.
