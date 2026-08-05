# FAZA 22B — Izolarea modificărilor FAZA 21E, validarea și push-ul fixului `595d381b`

**Data:** 2026-07-29
**Branch:** `feat/category-price-and-salary-model`
**Commit vizat:** `595d381b5707550a9019332988b5467f64d34bc7` — "fix: keep public listing counts synchronized"

---

## A. Verdict

**PUSH SUCCESSFUL — READY FOR DEPLOY REVIEW**

Commitul `595d381b` (fixul FAZA 22 pentru numărul de anunțuri din homepage) a fost verificat izolat într-un worktree curat, a trecut integral gate-ul final (lint, type-check, unit, Prisma, build, E2E ×2 pe 3 browsere) și a fost trimis pe `origin/feat/category-price-and-salary-model` printr-un push normal, fast-forward. Modificările necomise FAZA 21E au rămas complet intacte în tree-ul original, verificate bit-cu-bit (SHA-256) față de un checkpoint de siguranță creat înainte de orice operațiune. Nu s-a făcut deploy, merge, migrare sau nicio modificare de producție.

---

## B. Baseline (înainte de orice acțiune)

| Element | Valoare |
|---|---|
| Branch activ | `feat/category-price-and-salary-model` |
| HEAD local | `595d381b5707550a9019332988b5467f64d34bc7` |
| Parent commit | `02c86a4b` (feat SEO footer/hub/about/JSON-LD) |
| HEAD remote (`origin/...`) înainte de push | `3c376eff` |
| Ahead/behind local vs remote | 2 ahead (`02c86a4b`, `595d381b`), 0 behind |
| `git diff --check` | curat (exit 0) |
| Fișiere staged | niciunul |
| Fișiere tracked modificate (necomise) | 21 |
| Fișiere untracked | 7 (4 directoare docs/audits + 3 fișiere scripts/teste) |
| Producție | neatinsă — nicio conexiune VPS, niciun deploy în această fază |

Confirmat: HEAD local **era deja** `595d381b` la momentul baseline-ului (commit-ul fusese creat într-o sesiune anterioară). Nu a fost nevoie de investigație suplimentară — s-a trecut direct la audit.

---

## C. Audit commit `595d381b`

**`git show --stat` / `--name-status`:** 10 fișiere modificate, 415 inserții, 1 ștergere.

| Fișier | Motiv | FAZA 22 | FAZA 21E | Legat de fix | Test | Verdict |
|---|---|:---:|:---:|:---:|:---:|---|
| `lib/cache/revalidate-marketplace.ts` (nou) | helper central invalidare on-demand | ✅ | — | da | teste dedicate | OK |
| `next.config.ts` | Cache-Control dedicat `/` (`max-age=0, must-revalidate`) | ✅ | — | da | verificat prin build+curl | OK |
| `app/api/listings/route.ts` | invalidare la create direct-active | ✅ | — | da | integrare | OK |
| `app/api/listings/[id]/route.ts` | invalidare la PATCH (pause/reactivate) și DELETE (soft-delete) | ✅ | — | da | integrare | OK |
| `app/api/admin/moderation/[id]/approve/route.ts` | invalidare la approve | ✅ | — | da | integrare | OK |
| `app/api/admin/moderation/[id]/reject/route.ts` | invalidare la reject | ✅ | — | da | integrare | OK |
| `app/api/admin/bulk-actions/route.ts` | invalidare bulk approve/reject/delete | ✅ | — | da | integrare | OK |
| `tests/unit/home-page-stats.test.ts` (nou) | teste count canonic | ✅ | — | da | e testul | OK |
| `tests/unit/revalidate-marketplace.test.ts` (nou) | teste helper | ✅ | — | da | e testul | OK |
| `tests/e2e/homepage-catalog-count-lifecycle.spec.ts` (nou) | E2E lifecycle | ✅ | — | da | e testul | OK |

**Scanare explicită (rezultat: nimic găsit):**
- fișiere FAZA 21E (`LoginForm.tsx`, `ListingJsonLd.tsx`, `listing-offer-jsonld.ts`, scripturi `deploy-*`, `docs/audits/faza21*`) — **absente**
- secrete (chei private, `sk_live`/`pk_live`, tokenuri GitHub, `DATABASE_URL` cu valoare reală) — **absente**
- `prisma/schema.prisma` sau `prisma/migrations/` — **absente**
- Stripe/payments, DNS, Cloudflare, GSC/Bing/IndexNow — **absente**
- date demo, fișiere generate, rezultate de teste — **absente**
- `git diff --check` pe `595d381b^..595d381b` — curat (exit 0)

**Verdict secțiune C:** commitul conține **exclusiv** fixul FAZA 22 (helper + integrare + Cache-Control + teste). Confirmat curat.

---

## D. Inventar FAZA 21E (working tree necomis)

| Fișier | tracked/untracked | scop probabil | clasificare | risc secret |
|---|---|---|---|---|
| `.github/workflows/deploy.yml` | tracked M | comentariu audit legacy workflow | CONFIRMAT FAZA 21E | nu |
| `app/auth/login/page.tsx` | tracked M | fix Suspense/login | CONFIRMAT FAZA 21E | nu |
| `app/components/LoginForm.tsx` | tracked M | fix DOM duplicat | CONFIRMAT FAZA 21E | nu |
| `app/listings/[id]/ListingJsonLd.tsx` | tracked M | JobPosting validThrough/employmentType | CONFIRMAT FAZA 21E | nu |
| `docs/audits/faza21/GOOGLE-JOBS.md` | tracked M | audit JobPosting | CONFIRMAT FAZA 21E | nu |
| `lib/seo/listing-offer-jsonld.ts` | tracked M | `buildJobEmploymentType` | CONFIRMAT FAZA 21E | nu |
| `scripts/deploy-*.sh` ×7, `scripts/rollback.sh` | tracked M | marcaj „LEGACY — DO NOT USE” | CONFIRMAT FAZA 21E | nu |
| `tests/e2e/*.spec.ts` ×5 | tracked M | selectoare/wizard actualizate | CONFIRMAT FAZA 21E | nu |
| `tests/integration/api.integration.test.ts` | tracked M | contract register | CONFIRMAT FAZA 21E | nu |
| `tests/unit/listing-offer-jsonld.test.ts` | tracked M | teste employmentType | CONFIRMAT FAZA 21E | nu |
| `docs/audits/faza21b/REPORT.md`, `faza21c/REPORT.md`, `faza21d/REPORT.md` | untracked | rapoarte fază conexă | CONFIRMAT FAZA 21E | nu |
| `scripts/deploy-production-release.sh`, `scripts/rollback-production-release.sh` | untracked | pipeline nou de deploy | CONFIRMAT FAZA 21E (header explicit) | nu |
| `tests/e2e/helpers/category-picker.ts` | untracked | helper E2E | CONFIRMAT FAZA 21E | nu |
| `docs/audits/faza22/REPORT.md` | untracked | raport FAZA 22 (fix deja comis) | **CONFIRMAT FAZA 22**, nu FAZA 21E | nu |

Total: 21 fișiere tracked modificate + 7 fișiere untracked = 28. Zero `NECUNOSCUT`, zero `GENERAT`, zero `SENSIBIL`. `git diff --check` pe working tree — curat.

---

## E. Checkpoint patch (plasă de siguranță)

| Element | Valoare |
|---|---|
| Director checkpoint | `/tmp/faza21e-checkpoint.kYKN39` (în afara repo) |
| Dimensiune totală | 160 KB |
| `tracked-changes.patch` (SHA-256) | `f083840a497dc3aaf6a9e8579a90d9eaecbfee1e46c1ff035cafebe1316b1ed2` |
| Fișiere tracked în patch | 21 |
| Fișiere untracked copiate (cu hash individual) | 7 |
| Fișiere sensibile excluse | 0 (nu există `.env`/chei/tokenuri în tree) |
| Comis? | NU |
| Împins? | NU |
| Folosit pentru curățare tree original? | NU |

Checkpoint-ul rămâne pe disc local, neatinsă tree-ul original.

---

## F. Worktree curat

| Element | Valoare |
|---|---|
| Director temporar | `/tmp/faza22-clean-worktree.9YiNrp` (creat via `mktemp -d` + `git worktree add --detach`) |
| HEAD worktree | `595d381b5707550a9019332988b5467f64d34bc7` ✅ |
| `git status --short` la creare | gol (0 fișiere) |
| `git diff --check` | curat |
| Fișiere FAZA 21E prezente | 0 |
| Modificări necomise prezente | 0 |

Notă: pentru a rula gate-ul (lint/build/E2E) am adăugat în worktree, **doar local, ca symlink-uri, niciodată comise**: `node_modules`, `.env`, `.env.production` (spre fișierele originale din repo-ul principal). Acestea nu fac parte din commit și au fost eliminate odată cu worktree-ul.

---

## G. Verificarea invalidării (în worktree, cod de la `595d381b`)

Confirmat prin citire directă a codului din worktree (nu din memorie):

- helper canonic: `lib/cache/revalidate-marketplace.ts` → `revalidatePublicMarketplaceSurfaces()`
- apelat în **9 puncte**, toate **după** `await prisma.listing.*` reușit (garantat structural de `async/await`: o excepție ar sări direct la `catch`, fără a atinge linia de invalidare):
  - `app/api/listings/route.ts:1104` — create direct-active
  - `app/api/listings/[id]/route.ts:394` — PATCH status/moderationStatus (acoperă atât **pause** cât și **reactivate/republish**, singurul traseu existent pentru aceste tranziții)
  - `app/api/listings/[id]/route.ts:523` — DELETE soft-delete
  - `app/api/admin/moderation/[id]/approve/route.ts:104` — approve
  - `app/api/admin/moderation/[id]/reject/route.ts:91` — reject
  - `app/api/admin/bulk-actions/route.ts:115,150,208` — bulk approve/reject/delete
- „renew”: nu există un endpoint separat de renew în cod; orice extindere a expirării trece prin PATCH pe `[id]`, deja acoperit.
- eșecul DB nu invalidează fals — verificat structural (poziția apelului e strict post-`await` reușit).
- homepage nu mai păstrează cache de o oră în browser — `Cache-Control: public, max-age=0, must-revalidate` verificat live prin `curl -I` pe build-ul din worktree.
- alte rute nu au fost afectate — regula generală `max-age=3600` rămâne neschimbată pentru restul rutelor (override e specific pentru `/`).
- regula canonică de vizibilitate publică (`seoIndexableListingWhere`) rămâne unică — nu a fost dublată.
- count-ul folosește `prisma.listing.count` fără paginare, nu prima pagină, nu e hardcodat — confirmat în `tests/unit/home-page-stats.test.ts`, prezent și trecut în worktree.

Nicio cale activă de mutație a eligibilității publice a fost găsită fără invalidare asociată.

---

## H. Gate lint / type-check / unit / Prisma / build (în worktree)

| Verificare | Rezultat |
|---|---|
| `npm run lint` (`eslint . --max-warnings=0`) | ✅ PASS, 0 warnings |
| `npm run type-check` (`tsc --noEmit`) | ✅ PASS, 0 erori |
| `npm test -- tests/unit` | ✅ 123 suite, 831 teste — toate PASS |
| `npx prisma validate` | ✅ schema validă |
| `npx prisma generate` | ✅ generat (notă: update major disponibil 5.22→7.9, informativ, neaplicat) |
| `npx prisma migrate status` | ✅ „Database schema is up to date!” — 0 migrări în așteptare |
| `npm run build` | ✅ „Compiled successfully in 11.2s”, `/` prezent ca rută statică ISR 5m |
| `git diff --check` (post-build) | ✅ curat |

SHA build: `595d381b5707550a9019332988b5467f64d34bc7` · Tree hash: `36b5256731f04e673ef5575191b101b1934f3f5d` · `BUILD_ID`: `vxtc566dxxF_o_q-YRCv5`.

---

## I. E2E Chromium / Mobile Chrome / WebKit ×2

Server pornit din build-ul worktree-ului pe portul dedicat **3420** (PID 90079), health `/api/health` → 200 constant (înainte, între, după).

Suită rulată: `tests/e2e/homepage-catalog-count-lifecycle.spec.ts` — Cache-Control + lifecycle (approve +1 / pause −1).

| Rulare | Chromium | Mobile Chrome | WebKit | Total |
|---|---|---|---|---|
| Rulare 1 | 2/2 PASS | 2/2 PASS | 2/2 PASS | 6/6 PASS |
| Rulare 2 (consecutivă, fără modificări) | 2/2 PASS | 2/2 PASS | 2/2 PASS | 6/6 PASS |

Aceeași SHA, același `BUILD_ID` (`vxtc566dxxF_o_q-YRCv5`, neschimbat între rulări), același server, fără retry, zero skip, zero `ECONNREFUSED`, zero 500. Tree-ul worktree a rămas curat (`git diff --check` OK) după ambele rulări. Serverul a fost oprit curat înainte de continuarea fazei (confirmat zero procese reziduale pe port 3420).

---

## J. Remote pre-push

```
git fetch origin
origin/feat/category-price-and-salary-model = 3c376eff   (neschimbat față de baseline)
git merge-base --is-ancestor origin/... 595d381b → YES (fast-forward posibil)
ahead/behind: 0 behind, 2 ahead
```

Remote nu a avansat și nu a divergent între baseline și momentul push-ului.

---

## K. Push

```
git push origin 595d381b:refs/heads/feat/category-price-and-salary-model
   3c376eff..595d381b  595d381b -> feat/category-price-and-salary-model
```

Push efectuat **din worktree-ul curat**, normal, fără `--force`, fără tag-uri, fără merge, fără schimbarea bazei PR.

---

## L. Local = remote

| Sursă | HEAD |
|---|---|
| Worktree (după fetch) | `595d381b` |
| `origin/feat/category-price-and-salary-model` (după fetch) | `595d381b` |
| Repo principal (branch local) | `595d381b` |
| Repo principal (`origin/...` tracking, după fetch) | `595d381b` |

**MATCH confirmat pe toate cele 3 referințe.**

---

## M. PR

`gh` CLI nu era autentificat local (`gh auth login` necesar) — nu am putut interoga programatic starea PR-ului. Commit-ul este vizibil pe remote (confirmat prin `git ls-remote`/`fetch`); recomand verificare manuală a PR-ului asociat branch-ului `feat/category-price-and-salary-model` în interfața GitHub înainte de aprobarea deploy-ului. Nu s-a creat, modificat sau combinat niciun PR din această fază.

---

## N. Verificarea tree-ului original (post-push)

| Verificare | Rezultat |
|---|---|
| `git status --short` vs. checkpoint | **IDENTIC** |
| `git diff --stat` vs. checkpoint | **IDENTIC** |
| SHA-256 `tracked-changes.patch` (regenerat) vs. checkpoint | **IDENTIC** (`f083840a...b1ed2`) |
| SHA-256 pentru fiecare din cele 7 fișiere untracked | **IDENTIC** cu checkpoint, fișier cu fișier |
| Fișiere pierdute | 0 |
| Fișiere comise accidental | 0 |
| Fișiere împinse accidental | 0 |

Nicio pierdere. Incident: niciunul.

---

## O. Probleme rămase

- Worktree-uri reziduale **dintr-o fază anterioară** (nu create în această sesiune): `/private/tmp/wt-base` (`3c376eff`) și `/private/tmp/wt-candidate` (`02c86a4b`) — în afara scopului acestei faze, nu au fost atinse; recomand curățare separată când sunt confirmate ca nemaifiind necesare.
- `gh` CLI neautentificat local — verificarea stării PR-ului trebuie făcută manual sau după autentificare.
- Modificările FAZA 21E rămân necomise și neaudit-ate — auditul lor face obiectul unei faze viitoare separate, nu al acesteia.

## P. Planul de deploy

Niciun plan de deploy nu a fost executat sau inițiat. Următorul pas legitim, **separat de această fază**, este o cerere explicită de aprobare deploy pentru `595d381b` pe `feat/category-price-and-salary-model` → `main`, incluzând verificarea PR, urmată de fereastra de deploy controlat conform procedurii FAZA 21E deja documentate (`scripts/deploy-production-release.sh`, încă necomis).

## Q. Confirmări obligatorii

| Confirmare | Răspuns |
|---|---|
| Commit nou | NU |
| Amend | NU |
| Rebase | NU |
| Merge | NU |
| Force push | NU |
| Push `595d381b` | **DA** |
| FAZA 21E comisă | NU |
| FAZA 21E împinsă | NU |
| FAZA 21E pierdută | NU |
| Deploy | NU |
| Producție modificată | NU |
| Migrare | NU |
| Date live modificate | NU |
| DNS/Cloudflare | NU |
| Stripe/plăți | NU |
| Uploaduri/backupuri șterse | NU |

---

**STOP.** Fixul `595d381b` este pe remote, verificat, izolat de FAZA 21E. Aștept aprobare separată pentru deploy.
