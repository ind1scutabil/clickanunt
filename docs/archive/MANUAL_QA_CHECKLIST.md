# MANUAL_QA_CHECKLIST

## 0. Setup
- Rulează backend web: `npm run dev`
- Rulează mobile: `cd apps/mobile && npm run start`
- Logare cu cont valid

## 1. Auth
- [ ] Login valid -> intrare în app
- [ ] Login invalid -> mesaj eroare
- [ ] Restart app -> sesiune restaurată
- [ ] Logout -> revine la login

## 2. Home + Categories
- [ ] Lista se încarcă
- [ ] Selectare categorie filtrează rezultate
- [ ] Tap pe card deschide detalii
- [ ] Buton Contact deschide flow de contact
- [ ] Empty state afișează CTA publicare

## 3. Listing details
- [ ] Galerie foto scroll orizontal
- [ ] Scroll vertical funcțional
- [ ] Specificații afișate (an, km, combustibil etc.)
- [ ] Dacă backend indisponibil și cache există: mesaj „Afișăm ultimele date salvate”

## 4. Publish listing
- [ ] CTA Publică anunț deschide formular
- [ ] Upload imagine din galerie
- [ ] Captură foto cameră
- [ ] Submit create/edit succes
- [ ] Erori submit afișate corect

## 5. Favorites + Messages + Notifications
- [ ] Favorite list load + refresh
- [ ] Mesaje: conversații load + thread + trimite
- [ ] Notificări list load

## 6. Offline/cache
- [ ] Cu flag cache ON, home/favorites/details pot reveni din cache când backend cade
- [ ] Mesajul de fallback cache este vizibil

## 7. Observability/events
Activează:
- `FEATURE_ENTERPRISE_OBSERVABILITY=true`
- `FEATURE_ENTERPRISE_EVENT_TRACKING=true`

Verifică în logs server:
- [ ] `app_open`
- [ ] `login_success` / `login_fail`
- [ ] `view_listing`
- [ ] `search`
- [ ] `contact_seller`
- [ ] `publish_listing`

## 8. Security checks
- [ ] CSRF prezent pentru POST/PATCH
- [ ] JWT bearer/cookie funcționează pe endpoint-uri protejate
- [ ] Rate-limit login/messages/listings activ (test burst requests)
- [ ] Cu `FEATURE_ENTERPRISE_SECURITY_HARDENING=true`, login CORS acceptă doar origin permis

## 9. Preflight
- [ ] Root: `npm run preflight`
- [ ] Mobile: `cd apps/mobile && npm run preflight`
