# Notifications, email, and scheduled jobs (FAZA 16)

Status labels used below are operational facts for this repository, not production SLAs.

## Systems (canonical)

| System | Persistence | Delivery | Notes |
|--------|-------------|----------|-------|
| `UserNotification` | PostgreSQL | In-app list/API | Owner-scoped; mark-read / mark-all-read |
| `AdminNotification` | PostgreSQL | Admin UI | RBAC via admin permissions |
| Message `isRead` / unread | PostgreSQL | Inbox + SSE | Receiver-only mark-read |
| Email (verification / reset / invoice / broadcast) | Provider call or mock/outbox | SMTP when configured | `SMTP_PASS` **or** `SMTP_PASSWORD` |
| `PushDeviceToken` | PostgreSQL | **None** | Stored only — `delivery: not_implemented` |
| Cron HTTP endpoints | N/A | Scheduler must call them | Fail-closed without `CRON_SECRET` |

## Email configuration

Required for real SMTP:

- `SMTP_HOST`
- `SMTP_PORT` (optional, default 587)
- `SMTP_USER`
- `SMTP_PASS` **or** `SMTP_PASSWORD` (either accepted)
- `SMTP_FROM` (recommended; required by some mailers)

Without SMTP: verification flows may use mock/outbox in test/local; UI must treat requests as accepted, not as delivered.

Never log full verification/reset URLs, JWT, refresh tokens, or recipient sample lists.

## Push notifications

- Registration: `POST /api/notifications/push-token` stores Expo-style tokens for the authenticated user.
- **No Expo/FCM sender exists.** Classify as **persistat, dar nelivrat**.
- Do not claim mobile push is functional in production.

## Cron / schedulers

| Job | Route | Declared scheduler | Effective on VPS/PM2 |
|-----|-------|--------------------|----------------------|
| Expire promotions | `GET/POST /api/cron/expire-promotions` | `vercel.json` every 15m | **NECONFIRMAT** for this VPS deploy |
| Analytics drain + rollup | `GET /api/cron/analytics` | Not in `vercel.json` | **NECONFIRMAT** / orphan unless wired |

Auth (both):

- Fail-closed if `CRON_SECRET` unset → **503**
- Wrong/missing secret → **401**
- `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`
- Query-string secrets are **not** accepted

### Suggested VPS crontab (scaffold — do not install from this phase)

```cron
# Requires CRON_SECRET in the environment of the caller.
*/15 * * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" https://www.clickanunt.ro/api/cron/expire-promotions >/dev/null
15 3 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" https://www.clickanunt.ro/api/cron/analytics >/dev/null
```

A row in `vercel.json` is **not** proof that PM2/Linux cron runs the job.

## Listing vs promotion expiry

- **Listing public visibility**: query-time (`expiresAt` + status) — no status-flip cron required for correctness.
- **Promotion**: `expireAllExpiredPromotions` + lazy `applyListingPromotionExpiryIfNeeded`; Payment/Invoice rows must remain.

## SSE messaging

- Cookie-first (`accessToken`), then Bearer.
- Query `?token=` JWT is **rejected / unsupported** (must not appear in URLs or access logs).

## Invoices / PDF

- Download endpoints serve HTML (or similar) from DB fiscal fields where present.
- Real PDF / ANAF compliance is **OUT OF SCOPE** unless separately specified.
