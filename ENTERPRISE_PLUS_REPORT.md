# ENTERPRISE_PLUS_REPORT

## Scope
Upgrade incremental pentru aplicația mobilă (`apps/mobile`) + API Next.js, cu schimbări gated prin feature flags și fără refactor major.

## Stack detectat
- Mobile: Expo + React Native + TypeScript (`apps/mobile`)
- API/Web: Next.js App Router + TypeScript (`app/api/**`)
- DB: Prisma (`prisma/schema.prisma`)
- Testing: Jest + Playwright existente (`tests/unit`, `tests/e2e`)

## Feature Flags (default OFF)
Sursă centrală server: `lib/feature-flags.ts`
Sursă centrală mobile: `apps/mobile/src/featureFlags.ts`

Flags adăugate:
- `enterprise_observability`
- `enterprise_event_tracking`
- `enterprise_network_hardening`
- `enterprise_cache_offline`
- `enterprise_ux_polish`
- `enterprise_security_hardening`

Toate au default `false`.

## Ce s-a implementat
### M1 Observabilitate
- API telemetry endpoint: `app/api/telemetry/events/route.ts`
- API flags endpoint: `app/api/feature-flags/route.ts`
- Mobile telemetry + breadcrumbs: `apps/mobile/src/telemetry.ts`
- Evenimente instrumentate:
  - `app_open`
  - `login_success`
  - `login_fail`
  - `view_listing`
  - `search`
  - `contact_seller`
  - `publish_listing`

### M2 Network hardening
- Standardizare request layer în `apps/mobile/src/api/client.ts`:
  - timeout
  - retry max 1
  - exponential backoff safe
  - abort controller
  - `x-request-id` tracing
- Request tracing header în middleware: `middleware.ts`

### M3 Cache & offline
- Cache local (AsyncStorage) pentru:
  - home/listings
  - listing details
  - favorites
- Strategie SWR + fallback cache
- Mesaj UI explicit: „Afișăm ultimele date salvate”

### M4 UX resilience
- Global error boundary mobile: `apps/mobile/src/components/AppErrorBoundary.tsx`
- Empty state contextual cu CTA în Home
- Scroll restore la revenire pe feed

### M5 Security hardening
- Login CORS strict (optional) gated prin `enterprise_security_hardening`
- Verificare rate-limit existent:
  - login: `validateSecureRequest(... rateLimit: 'login')`
  - contact_seller (mesaje): `validateSecureRequest(... rateLimit: 'messages')`
  - publish_listing: `validateSecureRequest(... rateLimit: 'listings')`

### M6 Release readiness
- Script `preflight` adăugat în root `package.json`
- Script `preflight` adăugat în `apps/mobile/package.json`
- Rapoarte: acest fișier + checklist + rollback

## Validări rulate repetat pe module
- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run build`
- `cd apps/mobile && npm run typecheck`

## Status validare actual
- Root lint: PASS după ajustare rule mobile `jsx-a11y/alt-text`
- Root type-check/build: PASS pentru blocajul `test-login` corectat
- Root test: PASS
- Mobile typecheck: PASS

## Riscuri/observații
- Flag-urile sunt OFF implicit; pentru activare controlată, folosește env vars.
- Telemetry endpoint folosește `RATE_LIMITS.API`; pentru volum mare recomand Redis-backed limiter.

## Dependințe noi
- Nu au fost adăugate librării noi grele.
- S-a reutilizat `@react-native-async-storage/async-storage` deja existentă.

## Nu pot confirma acest lucru
- Nu pot confirma livrarea push end-to-end APNs/FCM în Expo Go; necesar test în development build / release build.
- Nu pot confirma load/latency production fără test de performanță pe infrastructura target.
