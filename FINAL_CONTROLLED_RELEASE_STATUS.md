# Final controlled release — staging status

**Data:** 2026-05-14  
**Acțiuni:** analiză `git status`, `.gitignore`, **`git add` selectiv** (fără `git add .`, fără `git clean`, fără `reset`, fără deploy/push). **Nu** s-au editat fișiere de aplicație în această sesiune (doar `.gitignore` + staging).

---

## Clasificare (pașii 1–2)

### A) Production code (staged)

Toate modificările urmărite (`M`) din `app/`, `apps/mobile/`, `lib/` (inclusiv `lib/security/validation-schemas.ts`), `prisma/schema.prisma`, `prisma/migrations/` (ambele `migration.sql` noi), `scripts/deploy-prod-from-local.sh`, plus fișierele noi neversionate necesare: `app/account/`, `app/api/admin/notifications/**`, `app/api/users/me/deactivate/`, `app/api/users/me/notification-preferences/`, `app/components/admin/Admin*.tsx`, `apps/mobile/src/navigation/types.ts`, `lib/admin-notification-*.ts`, `lib/user-account-settings-json.ts`. **Inclus în același index:** `FINAL_CONTROLLED_RELEASE_STATUS.md` (raport audit).

### B) Docs / rapoarte locale (**nu** staged)

| Fișier |
|--------|
| `FINAL_RELEASE_READY_REPORT.md` |
| `PRISMA_DRIFT_RECONCILIATION.md` |
| `REBUILD_MOBILE_HOME_FROM_REFERENCE.md` |
| `SAFE_DEPLOY_INCLUDE_LIST.md` |
| `SAFE_DEPLOY_SCOPE.md` |
| `SAFE_PRODUCTION_DEPLOY_PLAN.md` |
| `SAFE_RELEASE_CANDIDATE.md` |

### C) Screenshots / temp / cache

- Screenshots: acoperite de `**/Screenshot*.png`, `**/Screen Shot*.png` în `.gitignore`.
- `node_modules/`, `.next/`, `.turbo/`, `.eslintcache`, `/tmp/`, etc.: deja în `.gitignore`.
- `.cursor/`: în `.gitignore`.

### D) Uploads persistente

- `public/uploads/`, `uploads/`, `storage/`: **ignorate** în git (nu se șterg de pe disc); deploy creează directoare pe VPS.

### E) Nu intră în release

- Asset-uri hero **backup** locale: `public/images/hero/*backup*` (pattern nou în `.gitignore`).

---

## `.gitignore` (pas 3)

- Adăugat: `!/FINAL_CONTROLLED_RELEASE_STATUS.md` (lângă excepția pentru `FINAL_RELEASE_READY_REPORT.md`).
- Adăugat: `/public/images/hero/*backup*` și `/public/images/hero/*-backup-*` pentru fișierele hero backup.

---

## Staging controlat (pas 4)

Comenzi echivalente (executate):

1. `git add .gitignore`
2. `git add $(git diff --name-only)` — **doar** fișiere urmărite modificate (fără `git add .`).
3. `git add` explicit pe fiecare path nou de production (notifications, account settings, deactivate, notification-preferences, admin components, mobile `types.ts`, lib admin helpers, ambele `migration.sql`).

**Nu** s-au folosit: `git add .`, `git clean`, `reset`.

---

## Verificări (pas 5)

| Comandă | Rezultat |
|---------|----------|
| `npm run lint` | OK |
| `npm run type-check` | OK |
| `npm run build` | OK |
| `npx prisma validate` | OK |
| `npx prisma migrate status` | OK — „Database schema is up to date!” (DB din `.env` local) |

---

## Fișiere **staged** (exact, pas 6)

*(66 de path-uri în index — listă `git diff --cached --name-only` la momentul raportului.)*

```
.gitignore
FINAL_CONTROLLED_RELEASE_STATUS.md
app/account/settings/page.tsx
app/admin/dashboard/page.tsx
app/admin/invoices/page.tsx
app/admin/moderation/page.tsx
app/admin/promotions/page.tsx
app/api/admin/notifications/[id]/read/route.ts
app/api/admin/notifications/[id]/resolve/route.ts
app/api/admin/notifications/mark-all-read/route.ts
app/api/admin/notifications/route.ts
app/api/admin/users/[id]/ban/route.ts
app/api/admin/users/[id]/suspend/route.ts
app/api/auth/register-extended/route.ts
app/api/auth/register/route.ts
app/api/cron/analytics/route.ts
app/api/cron/expire-promotions/route.ts
app/api/dashboard/stats/route.ts
app/api/listings/route.ts
app/api/messages/[userId]/route.ts
app/api/payments/webhook/route.ts
app/api/reports/route.ts
app/api/users/me/deactivate/route.ts
app/api/users/me/notification-preferences/route.ts
app/api/users/me/route.ts
app/auth/login/page.tsx
app/auth/signup/page.tsx
app/components/Footer.tsx
app/components/ListingsView.tsx
app/components/LoginForm.tsx
app/components/MobileBottomNav.tsx
app/components/NavbarContent.tsx
app/components/NavbarShell.tsx
app/components/OptimizedListingFlow.tsx
app/components/SignupFormExtended.tsx
app/components/admin/AdminAlertCenter.tsx
app/components/admin/AdminNavNotificationBell.tsx
app/components/dashboard/ViewsLast7DaysChart.tsx
app/dashboard/account/page.tsx
app/dashboard/favorites/page.tsx
app/dashboard/listings/page.tsx
app/dashboard/page.tsx
app/dashboard/settings/page.tsx
app/favorites/page.tsx
app/globals.css
app/layout.tsx
app/listings/[id]/page.tsx
app/listings/[id]/promote/page.tsx
app/listings/page.tsx
apps/mobile/src/navigation/AppNavigator.tsx
apps/mobile/src/navigation/types.ts
apps/mobile/src/screens/FavoritesScreen.tsx
apps/mobile/src/screens/HomeScreen.tsx
apps/mobile/src/screens/ListingDetailsScreen.tsx
apps/mobile/src/screens/NotificationsScreen.tsx
apps/mobile/src/theme.ts
lib/admin-notification-access.ts
lib/admin-notification-rules.ts
lib/admin-notification-types.ts
lib/admin-notifications.ts
lib/security/validation-schemas.ts
lib/user-account-settings-json.ts
prisma/migrations/20260510200000_enterprise_bulk_import/migration.sql
prisma/migrations/20260513180000_admin_notifications/migration.sql
prisma/schema.prisma
scripts/deploy-prod-from-local.sh
```

---

## Fișiere care **rămân locale** (neversionate / ne-staged)

| Fișier |
|--------|
| `FINAL_RELEASE_READY_REPORT.md` |
| `PRISMA_DRIFT_RECONCILIATION.md` |
| `REBUILD_MOBILE_HOME_FROM_REFERENCE.md` |
| `SAFE_DEPLOY_INCLUDE_LIST.md` |
| `SAFE_DEPLOY_SCOPE.md` |
| `SAFE_PRODUCTION_DEPLOY_PLAN.md` |
| `SAFE_RELEASE_CANDIDATE.md` |

Capturi `Screenshot*.png` / fișiere sub `.cursor/` / upload-uri: **ignorate** de git (nu apar ca `??` dacă respectă `.gitignore`). Hero backup-uri: **ignorate** după actualizarea `.gitignore`.

---

## Verdict final

### **RELEASE READY: YES**

*(În sensul: **index de staging** conține doar cod de producție necesar + acest raport, verificările `lint` / `type-check` / `build` / Prisma trec pe snapshot-ul staged + working tree aliniat la index pentru aceste fișiere.)*

**Condiție pentru deploy script:** `deploy-prod-from-local.sh` cere working tree **complet curat** → următorul pas este doar **`git commit`** (mesaj ales de voi); tot conținutul release-ului este deja în index:

```bash
git commit -m "release: controlled staging (admin notifications, migrations, deploy hardening)"
```

### Comenzi **FINALE** pentru deploy LIVE sigur (după commit + push; **nu** le rulați până nu sunteți gata)

```bash
npm run deploy:prod
```

*(Echivalent `bash scripts/deploy-prod-from-local.sh` — tree curat, apoi push + SSH: pull, `npm ci`, build, `prisma migrate deploy`, PM2. Pe LIVE: backup DB + verificare `migrate status` pe URL-ul de producție înainte, conform procesului vostru.)*

---

## Note

- **`prisma/schema.prisma`** este în staging ca fișier deja modificat în working tree înainte de această sesiune (nu a fost rescris aici).
- **`migrate status`** reflectă doar DB-ul din `.env` local; producția trebuie verificată separat înainte de `migrate deploy` pe LIVE.
