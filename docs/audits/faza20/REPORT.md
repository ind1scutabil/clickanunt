# FAZA 20 — Controlled production deploy

**Date:** 2026-07-28 (UTC)  
**Stamp:** `20260728T103328Z`  
**Deploy SHA:** `c984a8c99d70f4f211507c3c400dd68448968319`  
**Previous live SHA:** `a40ccde76d223491098b9f19744d37954ccdac01`  
**Feature audited base:** `c5435c1ce6a2383020954ae1c444b2723685e415`  
**Docs-only delta after audit:** `docs/audits/faza19/*`

## A. Verdict

# DEPLOY SUCCESSFUL — MONITORING

Site-ul rulează pe release-ul nou, migrările sunt aplicate, backupul a fost restaurat cu succes în DB temporară, uploadurile sunt intacte, PM2 este stabil, health/listings/imagini publice sunt 200.

**Riscuri reziduale factuale (nu „zero risc”):**

1. **Smoke autentificat controlat (20.11) neexecutat** — pe server nu există chei `TEST_*` / `E2E_*` autorizate; nu s-au folosit conturi reale ale utilizatorilor. Auth a fost verificat doar fail-closed (CSRF 200, login invalid 401, `test-login` API 403).
2. **Downtime scurt (~10:40:06–10:40:20Z)** în timpul switch-ului: lipsea `.env.production` în release → crash loop PM2 → 502 public; remediat prin symlink + restart.
3. **Shell-uri HTML admin/dashboard** răspund 200 anonim (pattern client-side preexistent); API admin relevant răspunde `401 Neautentificat`.
4. **Build înainte de migrate a eșuat** pe prerender (`priceType` lipsea) — rebuild obligatoriu după `migrate deploy` (justificat factual).
5. **`pm2 startOrReload` nu a schimbat cwd** — a fost necesar `pm2 delete` + `pm2 start` pe ecosystem-ul din release.

## B. SHA deployat

`c984a8c99d70f4f211507c3c400dd68448968319`  
Release: `/var/www/clickanunt-releases/20260728T103328Z-c984a8c9`  
`current` → același path  
BUILD_ID live: `ZSvrIBnr4TdOfbJet2dD2`

## C. SHA anterior

`a40ccde76d223491098b9f19744d37954ccdac01` (`messaging-stable`)  
Tree vechi păstrat: `/var/www/clickanunt` (nu a fost `reset --hard` / `clean`)  
BUILD_ID vechi: `F_sjNvi7qpRMO7kk_Lw1c`

## D. Domeniu canonic

**`https://www.clickanunt.ro`**

| Variantă | Observat |
|----------|----------|
| `https://www.clickanunt.ro` | 200 |
| `https://clickanunt.ro` | 301 → `https://www.clickanunt.ro/` |
| `http://www.clickanunt.ro` | 301 → https www |
| `http://clickanunt.ro` | 301 → https apex → www |
| canonical / og:url / sitemap host | `https://www.clickanunt.ro` |
| cookie CSRF domain | `.clickanunt.ro` |

## E. URL env înainte / după

Backup env: `/var/www/clickanunt/.env.faza20-pre-20260728T103328Z.bak` (mode 600, neafișat, necommis)

| Variabilă | Înainte (origin) | După (origin) | Stare |
|-----------|------------------|---------------|-------|
| NEXTAUTH_URL | `http://localhost:…` | `https://www.clickanunt.ro` | OK |
| NEXT_PUBLIC_APP_URL | localhost | `https://www.clickanunt.ro` | OK |
| NEXT_PUBLIC_BASE_URL | localhost | `https://www.clickanunt.ro` | OK |

Release leagă `.env` + `.env.production` prin symlink către tree-ul vechi (fără copiere în artifacts publice).

## F. Tree live și strategie releases

| Item | Detaliu |
|------|---------|
| Dirty pe `/var/www/clickanunt` | upload-uri tracked + `backups/` untracked (fără cod necunoscut) |
| Strategie | release separat; **fără** `git pull` în tree murdar; **fără** reset/clean/stash |
| Live cwd PM2 | `/var/www/clickanunt-releases/20260728T103328Z-c984a8c9` |
| Uploads | symlink → `/var/www/clickanunt/public/uploads` |
| Nginx uploads alias | rămâne pe path-ul persistent existent |

## G. Uploaduri înainte / după

| Metrică | Înainte | După | Stare |
|---------|---------|------|-------|
| Fișiere | 1130 | 1130 | OK |
| Bytes | 310190590 | 310190590 | OK |
| Sample SHA-256 (20) | — | 20 OK / 0 FAILED | OK |
| Sample URL imagini (10) | — | 10× HTTP 200 | OK |

## H. Backup / checksum

| Item | Valoare |
|------|---------|
| Path | `/var/www/clickanunt/backups/pre-faza20-20260728T103328Z.dump` |
| Mode | `600` |
| SHA-256 | `bbfe0e22976c22ea1fcc949d1c96d3274dd946836d6c19c2cb7896f649b104b5` |
| Șters? | **Nu** |

## I. Restore verification

Restore într-o DB temporară izolată: **PASS**. Counts identice cu live (35 users / 48 listings / 56 payments / 3 invoices / 13 conversations / 107 messages / 1 favorite / 0 reports / 25 migrations pre-deploy). Sample listing IDs match. Temp DB ștearsă după verificare. Backup păstrat.

## J. DB preflight (imediat înainte de migrate)

- Exact **5** migrări pending (nume așteptate)
- `dup Invoice.paymentId` = 0
- `priceType` absent
- long TX = 0
- Old app health/listings încă 200 pe schema pre-expand

## K. Migrări aplicate

`MIGRATE_START=2026-07-28T10:37:01Z` → `MIGRATE_END=2026-07-28T10:37:02Z` · exit 0

1. `20260726230000_listing_price_type_and_salary`
2. `20260727140000_invoice_payment_unique`
3. `20260727210000_user_session_version`
4. `20260727220000_auth_refresh_token_rotation`
5. `20260727230000_auth_email_verification_tokens`

Status după: **Database schema is up to date** (29 applied).

## L. Integritate DB după

| Check | Rezultat |
|-------|----------|
| `listings.priceType` | prezent; **FIXED n=48** |
| `priceAmount` null | 0 |
| salary inventat | 0 |
| `users.sessionVersion` | prezent |
| `auth_refresh_tokens` / `auth_email_verification_tokens` | prezente |
| `invoices_paymentId_key` | 1 |
| duplicate paymentId | 0 |
| counts | users 35 · listings 48 · payments 56 · invoices 3 · conversations 13 · messages 107 · favorites 1 · reports 0 |

## M. Build / BUILD_ID

| Build | Rezultat |
|-------|----------|
| Local precheck | PASS (unit 738, lint, tsc, prisma, build) |
| Release pre-migrate | **FAIL** prerender (`listings.priceType` missing) |
| Release post-migrate | **PASS** BUILD_ID `ZSvrIBnr4TdOfbJet2dD2` |

## N. PM2 înainte / după

| | Înainte | După |
|--|---------|------|
| status | online | online |
| pid | 1426825 | 1471229 |
| restarts | 27 | 0 (proces nou) |
| unstable | 0 | 0 |
| cwd | `/var/www/clickanunt` | release `…/c984a8c9` |
| script | `next start` (efectiv) | `scripts/production/pm2-start.mjs` |

## O. Health înainte / după

| | Înainte | După |
|--|---------|------|
| local `/api/health` | 200 | 200 |
| public health | 200 | 200 |
| `/api/listings` | 200 | 200 (+ `priceType`) |

Intermediar la switch defect: health 000 / public 502 (recuperat).

## P. Smoke public

| Flux | După | HTTP/rezultat | Stare |
|------|------|---------------|-------|
| health local/public | 200/200 | OK | OK |
| homepage | 200 | OK | OK |
| `/api/listings` | 200 | `priceType=FIXED` | OK |
| catalog `/listings` | 200 | OK | OK |
| search API | 200 | OK | OK |
| listing detail | 200 | OK | OK |
| images (10) | 200 | jpeg | OK |
| robots (origin) | 200 | Host www | OK |
| sitemap | 200 | www locs | OK |
| `/auth/login` | 200 | OK | OK |
| `/auth/register` | 200 | OK | OK |
| business | 200 | OK | OK |
| GDPR / privacy | 200 | OK | OK |
| 404 dummy | 404 | OK | OK |
| www/non-www/HTTPS | redirect→www 200 | OK | OK |
| admin HTML anon | 200 shell | API 401 | Residual |
| static / uploads nginx | 200 | OK | OK |

## Q. Smoke autentificat

**Neexecutat pe fluxuri 1–15** (fără conturi test autorizate în env).

Verificări fail-closed executate:

| Probe | Rezultat |
|-------|----------|
| CSRF | 200 |
| login credențiale invalide | 401, fără token |
| `/api/auth/test-login` | 403 `Not available` |
| cookie domain | `.clickanunt.ro` |

## R. Admin

- `/api/admin/users` anon → **401** `Neautentificat`
- HTML `/admin/*` shell 200 (fără PII utilizatori în HTML; doar emailuri publice contact@/dpo@/support@)
- Moderare autentificată: **neexecutată** (fără cont admin test)

## S. Stripe / webhook fără plată

| Check | Rezultat |
|-------|----------|
| `STRIPE_SECRET_KEY` / publishable / webhook secret | prezente |
| publishable | `pk_live_…` (coerent live) |
| `POST /api/webhooks/stripe` semnătură invalidă | **400** `Invalid signature` |
| `POST /api/payments/webhook` | 400 |
| PaymentIntent / charge / card | **neexecutat** |
| business CTA page | 200 |

## T. Resurse / loguri

| Metrică | După |
|---------|------|
| Disk | ~21% used · ~58G free |
| RAM | ~3.8G · available ~3.0G |
| Redis | PONG |
| Nginx -t | OK |
| Prisma errors post-stabilizare | absente în coada recentă (erorile ENOENT `.env.production` doar în fereastra de crash) |

## U. Defecte întâlnite

| ID | Severitate | Moment | Dovadă | Cauză | Acțiune | Rezultat |
|----|------------|--------|--------|-------|---------|----------|
| P0-ENVPROD | P0 | switch | PM2 waiting restart · public 502 · log ENOENT `.env.production` | release fără `.env.production` | symlink la shared + restart | recuperat; health 200 |
| P1-RELOAD-CWD | P1 | switch | `startOrReload` a lăsat cwd vechi / BUILD vechi | PM2 reload nu actualizează cwd | `pm2 delete` + `start` ecosystem release | cwd=release, `priceType` în API |
| P2-PREBUILD | P2 | release prep | build prerender P2022 `priceType` | build pe DB pre-expand | migrate → rebuild | build PASS |
| P2-AUTH-SMOKE | P2 | post | fără `TEST_*` keys | lipsă conturi autorizate | documentat; neexecutat 20.11 | residual |
| P3-ADMIN-SHELL | P3 | smoke | admin HTML 200 anon | auth client-side preexistent | API 401 confirmat | residual |

## V. Remedieri

1. Env URL-uri setate la origin canonic www.
2. Symlink `.env.production` în release.
3. Switch forțat pe ecosystem release după eșec reload.
4. Rebuild post-migrate.
5. Rollback release Prisma-compatibil construit (nu activat).

## W. Rollback release

| Item | Valoare |
|------|---------|
| Path | `/var/www/clickanunt-releases/20260728T103328Z-rollback-ed22afed` |
| SHA | `ed22afed55548c89727c72208cd882b505ddb8f3` |
| BUILD_ID | `saV5jvoFr-i7psGGsQnvm` |
| Uploads/env | symlink shared |
| Activat? | **Nu** |

**Interzis după migrate:** rollback app la `a40ccde7` / `ea6904b2`.  
**Permis:** switch PM2 la release `ed22afed` (sau `c984a8c9`) pe schema expandată.

**Limită restore DB:** doar dacă schema/date sunt corupte; ar pierde scrierile dintre backup `10:33:28Z` și restore.

## X. Backup retention

Păstrate: dump FAZA 20 + checksum, env bak, release live, release rollback, tree vechi, uploaduri, logs PM2. **Nicio curățare** de release-uri vechi.

## Y. Git / PR

- Deploy prin checkout SHA în worktree release (fără merge).
- Fără force / rebase / amend.
- Fără merge PR / auto-merge.
- Base PR neschimbată: `checkpoint/pre-category-price-salary` @ `ea6904b2`.
- Acest raport: commit docs separat pe branch-ul feature.

## Z. Confirmări

- fără pierdere demonstrată de date (counts identice; restore verify PASS)
- fără uploaduri șterse (1130/1130 + checksum OK)
- fără backupuri șterse
- fără hard reset / clean / stash pe live
- fără plăți reale / Stripe charge / PaymentIntent
- fără email / SMS / push reale
- fără force / rebase / amend
- fără merge
- base PR neschimbată
