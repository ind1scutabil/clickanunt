# Saved searches & alerts — design (no migration in FAZA 21)

**Status:** Product model **MISSING**. Preference flag `priceAlerts` exists in account settings JSON only.

## Proposed model (requires migration approval)

- userId
- query / category / subcategory / county / city / make / model
- priceType / currency / min / max
- frequency
- active
- lastNotifiedAt
- dedupe key

## Delivery

| Channel | Status |
|---------|--------|
| In-app notification | Possible if notifications model reused |
| Email | `PROVIDER NECONFIGURAT` until SMTP verified |
| Push | `NOT IMPLEMENTED` without push sender |

**STOP:** Do not add Prisma migration without explicit approval.
