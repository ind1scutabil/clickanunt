# Raport deploy live controlat — 2026-05-14

**Operator (agent Cursor):** verificări locale + raport.  
**Deploy pe serverul live:** **neexecutat din acest mediu** — vezi §A (condiție obligatorie backup pe VPS neconfirmată aici).

---

## A. Decizie: de ce nu s-a rulat deploy automat

Conform pașilor tăi: **„nu continua dacă backup-ul nu este confirmat”**.

- Din Cursor **nu există** confirmare că pe VPS s-a rulat `./scripts/backup-db.sh` și că fișierul `.sql.gz` este valid.
- **`npm run deploy:prod`** (`scripts/deploy-prod-from-local.sh`) face **SSH + `git pull` + build + `prisma migrate deploy` + PM2** pe mașina remote — nu se pornește fără confirmarea ta după backup pe server.

**După ce confirmi backup-ul pe VPS**, rulezi tu (sau din sesiunea ta controlată):

1. `cd /var/www/clickanunt` (sau `DEPLOY_DIR`)
2. Salvează: `git rev-parse HEAD` → **SHA producție înainte** (înlocuiește placeholder-ul din §B dacă diferă de `origin`)
3. `./scripts/backup-db.sh pre-deploy-<stamp>` → verifică fișierul în `./backups/`
4. `./scripts/migration-check-safe.sh` (doar status, fără reset)
5. Push branch de pe laptop: `git push origin messaging-stable`
6. Pe VPS: `git pull origin messaging-stable` (sau fluxul din `deploy-vps.sh` / `deploy:prod`)
7. Dacă `prisma migrate status` arată migrații pending **doar** non-destructive: `npx prisma migrate deploy`
8. `pm2 reload ecosystem.config.js --update-env` (sau restart echivalent)
9. Completează §D–F după verificări live.

---

## B. SHA-uri (referință Git)

| Rol | SHA | Notă |
|-----|-----|------|
| **`origin/messaging-stable` înainte de push** (remote actual) | `8007cd0146554e28da6cec26f354e5c607f1c4b7` | Rollback Git la acest commit dacă live = remote. |
| **HEAD local (candidat după push + pull pe VPS)** | _rulează `git rev-parse HEAD` pe laptop înainte de push_ | Conține: moderare admin mobilă, sync sesiune client (login/signup/dashboard), nav mobil + `AccountMenuPanel`, scripturi deploy-safe, acest raport. |
| **SHA producție real înainte de deploy** | _completează de pe VPS: `git rev-parse HEAD`_ | Poate diferi de `origin` dacă serverul nu e la zi. |

**Rollback pregătit:** da — `./scripts/rollback.sh <SHA_înainte_de_deploy>` din `/var/www/clickanunt`. Nu s-a aplicat rollback (nu s-a făcut deploy).

---

## C. Pre-deploy — verificări efectuate (local, repo)

| Pas | Rezultat |
|-----|----------|
| `git status` | **Curat** — `nothing to commit, working tree clean` |
| `git diff --stat` (working tree) | **Gol** (nimic nestaged) |
| `git fetch origin messaging-stable` + `git diff --stat origin/messaging-stable..HEAD` | **17 fișiere**, +1098 / −405 linii — domeniu limitat la moderare mobilă, nav, auth client sync, teste, scripturi deploy-safe, `.gitignore`, acest raport |
| Fără modificări neintenționate în zone interzise | **Confirmat pe diff `origin..HEAD`:** nu apar `lib/stripe.ts`, `prisma/schema.prisma`, rute `app/api/uploads`, fluxuri listings/homepage dedicate, webhook Stripe. Modificări **minore** în `LoginForm` / `SignupFormExtended` / `dashboard` = doar **broadcast sesiune client** (cerința „auth/session sync”); fără schimbare logică server auth în acest diff. |
| `npm run type-check` | **OK** |
| `npm run build` | **OK** |

### Fișiere în pachetul de deploy (`origin/messaging-stable..HEAD`)

```
.gitignore
POST_DEPLOY_VERIFICATION_REPORT.md
app/admin/moderation/page.tsx
app/components/LoginForm.tsx
app/components/MobileBottomNav.tsx
app/components/NavbarContent.tsx
app/components/SignupFormExtended.tsx
app/components/account/AccountMenuPanel.tsx
app/components/admin/UserModerationEnterprise.tsx
app/dashboard/page.tsx
lib/auth-session-events.ts
lib/hooks/useAdminAuth.ts
lib/is-admin-staff-client.ts
scripts/migration-check-safe.sh
scripts/pre-deploy-production-safe.sh
tests/e2e/admin.spec.ts
tests/integration/api.integration.test.ts
```

---

## D. Backup

| Pas | Status |
|-----|--------|
| Snapshot local opțional (`./scripts/pre-deploy-production-safe.sh`) | Poate fi rulat înainte de push; nu înlocuiește backup DB pe VPS |
| Backup DB pe VPS confirmat | **Neconfirmat** (blocaj deploy din agent) |
| `prisma migrate reset` | **Nu rulat** (interzis) |

---

## E. Comenzi rulate în această sesiune (agent)

```bash
git status
git fetch origin messaging-stable
git diff --stat origin/messaging-stable..HEAD
git diff --name-only origin/messaging-stable..HEAD
git rev-parse HEAD
git rev-parse origin/messaging-stable
npm run type-check
npm run build
```

**Nu s-au rulat:** `npm run deploy:prod`, `ssh`, `prisma migrate deploy`, `prisma migrate reset`, `git push`.

---

## F. Verificări live după deploy (completează tu imediat după release)

| Verificare | OK / Fail | Note |
|------------|-----------|------|
| Homepage desktop | | |
| Homepage mobil | | |
| Login admin | | |
| Logout | | |
| Meniu mobil: Moderare / Admin (staff) | | |
| User normal: fără acces admin | | |
| Publicare anunț | | |
| Upload poze | | |
| Promovare / Stripe (încărcare pagină; plată doar dacă testezi controlat) | | |
| Moderare anunțuri / utilizatori | | |

---

## G. Probleme / incidente

_(Niciun incident din partea agentului — deploy neexecutat.)_

| Problemă critică? | Acțiune |
|--------------------|---------|
| Da | Oprește verificările → `./scripts/rollback.sh <SHA_înainte>` pe VPS → nu patch-uri ad-hoc pe producție |

---

## H. Semnătură operator live

- [ ] Backup DB VPS confirmat înainte de pull/build
- [ ] Verificările din §F sunt OK sau excepțiile acceptate
- [ ] SHA rollback păstrat încă 7–14 zile

**Semnat / dată:** ________________________

---

*Deploy live rămâne sub controlul tău după confirmarea backup-ului pe VPS.*
