# ROLLBACK_PLAN

## Principiu
Rollback fără pierdere de date și fără migrare DB nouă (nu au fost introduse schimbări de schemă în acest upgrade).

## 1) Rollback rapid cod
Pe branch release/hotfix:
1. Identifică ultimul commit stabil anterior upgrade-ului.
2. Revert pe commiturile enterprise-plus, în ordine inversă:
   - `git revert <sha_latest> ... <sha_oldest>`
3. Rulează:
   - `npm run preflight`
   - `cd apps/mobile && npm run preflight`
4. Redeploy.

## 2) Kill-switch imediat (fără revert)
Setează toate flag-urile enterprise pe OFF:
- `FEATURE_ENTERPRISE_OBSERVABILITY=false`
- `FEATURE_ENTERPRISE_EVENT_TRACKING=false`
- `FEATURE_ENTERPRISE_NETWORK_HARDENING=false`
- `FEATURE_ENTERPRISE_CACHE_OFFLINE=false`
- `FEATURE_ENTERPRISE_UX_POLISH=false`
- `FEATURE_ENTERPRISE_SECURITY_HARDENING=false`

## 3) Incident playbook
- Dacă apar erori login: setează `FEATURE_ENTERPRISE_SECURITY_HARDENING=false`
- Dacă apar regressions network mobile: setează `FEATURE_ENTERPRISE_NETWORK_HARDENING=false`
- Dacă apar inconsistențe date cache: setează `FEATURE_ENTERPRISE_CACHE_OFFLINE=false`

## 4) Verificare post-rollback
- Login / logout
- Listings feed + details
- Publish listing
- Messages send
- Notifications list

## 5) Nu pot confirma acest lucru
- Nu pot confirma comportament APNs/FCM în Expo Go; rollback pentru push trebuie validat pe development/release build.
