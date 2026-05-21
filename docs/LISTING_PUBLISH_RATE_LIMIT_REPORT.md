# Listing publish rate limit — investigation report

**Date:** 2026-05-19  
**Symptom:** After ~10 listing publishes, UI shows: `Too many requests. Please try again in 538 seconds.`  
**Mode:** Read-only investigation (pre-fix)

---

## Exact error source

| Item | Value |
|------|--------|
| Message | `Too many requests. Please try again in ${N} seconds.` |
| File | `lib/security/middleware.ts` (`validateSecureRequest`) |
| HTTP | 429 |
| Trigger | `rateLimit: 'listings'` on secured routes |

Upload flow uses **`rateLimit: 'upload'`** (separate bucket) — not the primary cause of publish failure after 10 ads.

---

## Rate limiters on publish flow

| Route / step | Middleware preset | Key | Window | Max (logged-in) |
|--------------|-------------------|-----|--------|-----------------|
| `POST /api/listings` (publish) | `listings` | `listing:create:{userId}` | **1 hour** | **10** |
| `POST/PUT /api/listings/draft` | `listings` | same key | 1 hour | 10 (shared) |
| `PATCH /api/listings/[id]` | `listings` | same key | 1 hour | 10 (shared) |
| `POST /api/uploads` | `upload` | `image:upload:{userId}` | 1 hour | 100 (separate) |
| `/listings/new` (page) | — | no server limit on HTML | — | — |

Implementation: `lib/rate-limit-distributed.ts` → `case 'listings'` (mirrors `lib/rateLimit.ts` → `createListing`).

---

## Identifier type

- **Logged-in publish:** **user ID** (`listing:create:{userId}`), not IP-only.
- **Guest (no JWT in middleware):** falls back to **`api:{clientIp}`** — 100 req/min per IP.

`validateSecureRequest` reads `userId` from access token via `verifyAccessToken`.

---

## Secondary limit (not the 538s message)

`POST /api/listings` also checks **trust score daily quota** (`getRateLimit` in `lib/trustScore.ts`):

- Verified users: **50 / calendar day** (Romanian message: `Limită zilnică atinsă`)
- Neutral: 10/day

The UI English message with **seconds** matches **middleware hourly limit (10/h)**, not the trust daily message.

---

## Why ~10 listings then block

1. Hard cap **10 POST-equivalent operations per hour** per user on preset `listings`.
2. **Draft create/update** uses the **same** preset → multi-step publish consumes multiple slots per listing.
3. **538 seconds** ≈ remainder of 1-hour window — consistent with hourly counter.

---

## Recommended fix (implemented separately)

- **`listing_publish`:** 50 / 24h per authenticated user; low IP cap if anonymous.
- **`listing_draft`:** higher quota (draft saves ≠ publish).
- **`listing_update`:** separate PATCH quota.
- **Upload:** unchanged.
- **Romanian** error with reason + wait time.
- **Admin/moderator** elevated cap when role in token.
