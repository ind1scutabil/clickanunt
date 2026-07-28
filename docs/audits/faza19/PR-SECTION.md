# FAZA 19 — paste into PR #2

**Verdict: BLOCKED** for controlled production deploy until P1 env URL + dirty-tree deploy strategy are fixed.

- Candidate: `c5435c1c`
- Live: `a40ccde7` (`messaging-stable`)
- Migrări pending pe live: exact 5 (price/salary, invoice unique, sessionVersion, refresh tokens, email tokens)
- Preflight DB: 0 duplicate `paymentId`, schema pre-expand OK
- Simulare locală pe dump read-only din prod: migrate ×2 PASS; app health 200 pe sim
- Backup live existent este vechi; restore path demonstrat local pe dump — FAZA 20 trebuie backup fresh + restore-verify pe server
- **P1:** `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_BASE_URL` = localhost pe producție
- **P1:** working tree murdar (`public/uploads`)

Raport: `docs/audits/faza19/REPORT.md`  
Plan FAZA 20: `docs/audits/faza19/FAZA20-DEPLOY-DRAFT.md`
