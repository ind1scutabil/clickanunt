# Raport verificare post-deploy (producție)

**Data deploy:** _YYYY-MM-DD HH:MM (TZ)_  
**Operator:** _nume_  
**Branch deployat:** _ex: messaging-stable / main_  
**Commit SHA (după pull pe VPS):** _git rev-parse HEAD pe server_  
**SHA înainte de deploy (rollback):** _notat înainte de pull — critic pentru rollback_  
**Folder deploy:** trebuie să fie **`/var/www/clickanunt`** (sau `DEPLOY_ROOT` echivalent) — `scripts/rollback.sh` refuză altă cale.

---

## 0. Pre-deploy (completat înainte de `migrate deploy` / PM2)

| Pas | Status | Notă |
|-----|--------|------|
| Snapshot local (`./scripts/pre-deploy-production-safe.sh`) | ☐ | Fișier în `deploy-snapshots/` (gitignored) |
| Pe VPS: `git rev-parse HEAD` salvat pentru rollback | ☐ | |
| Pe VPS: `./scripts/backup-db.sh pre-deploy-<stamp>` | ☐ | Necesită `POSTGRES_PASSWORD` sau `DATABASE_URL` |
| Pe VPS: `./scripts/migration-check-safe.sh` | ☐ | Doar `prisma migrate status` — fără reset |
| Deploy executat **doar** din folderul aplicației live | ☐ | `cd "$DEPLOY_ROOT"` apoi fluxul vostru (`deploy-vps` / manual) |

---

## 1. Rezultat deploy

| Verificare | OK / Fail | Detalii |
|------------|-----------|---------|
| `npm ci` + `NODE_ENV=production npm run build` | | |
| `npx prisma migrate deploy` | | |
| `pm2 reload` / restart | | |
| `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health` | | Așteptat: `200` |

---

## 2. Smoke — site live (utilizatori)

Verificări în browser (HTTPS domeniu public), fără cache agresiv dacă e posibil.

| Zonă | OK / Fail | Observații |
|------|-----------|-------------|
| **Homepage** încarcă, fără 5xx | | |
| **Login** (utilizator real) | | |
| **Publicare anunț** (flux minimal: form + submit sau draft) | | |
| **Moderare admin** (listă, acțiune aprobare/respingere dacă aplicabil) | | |
| **Stripe / promovare** (pagină promote, fără eroare la încărcare; test plată doar dacă procedați controlat) | | |
| **Upload imagini** (creare/editare anunț cu fotografie) | | |

---

## 3. Eroare critică

Dacă apare **oricare** din: 5xx pe homepage, login indisponibil, pierdere date, migrații eșuate parțial, loop auth:

1. **Rollback imediat** pe VPS din același folder:
   ```bash
   cd /var/www/clickanunt   # sau DEPLOY_ROOT
   ./scripts/rollback.sh <SHA_înainte_de_deploy>
   ```
2. Confirmă health după rollback.
3. Notați cauza și timpul în tabelul de mai jos.

| Incident | Timp (UTC) | Acțiune |
|----------|--------------|---------|
| | | |

---

## 4. Semnătură

- [ ] Toate verificările din §2 sunt **OK** sau excepțiile sunt documentate acceptate.
- [ ] Rollback SHA este păstrat încă 7–14 zile.

**Semnat:** ________________

---

*Acest fișier este șablon operațional. Nu înlocuiește monitorizarea (loguri, Sentry, DB).*
