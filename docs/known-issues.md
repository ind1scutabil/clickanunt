# Known issues

Probleme pre-existente identificate în timpul verificărilor, independente de branch-ul/PR-ul
curent care le-a descoperit. Nu au fost investigate în profunzime — status: **neinvestigat**.

---

## 1. `listing-publish-rate-limit.test.ts` eșuează pe `main`/HEAD

- **Status:** neinvestigat, independent de branch-ul curent
- **Descoperit în:** verificare pre-deploy SEO (branch `feat/category-price-and-salary-model`), 28 iul 2026
- **Descriere:** Testul unitar `tests/unit/listing-publish-rate-limit.test.ts` eșuează consecvent,
  inclusiv pe codul nemodificat (commit `3c376eff`, HEAD live la momentul verificării).
  Nu are legătură cu schimbările SEO din acest PR (footer, hub-uri, `/about`).
- **Cum se reproduce:**
  1. `git worktree add --detach /tmp/wt-baseline HEAD` (sau checkout curat pe commit-ul live)
  2. `npm test -- tests/unit` în worktree-ul curat
  3. Rulat izolat (`npm test -- tests/unit/listing-publish-rate-limit.test.ts`) testul
     pare să intre în hang; rulat ca parte din suita completă eșuează rapid și determinist.
- **Output exact din verificare:**

  ```
  FAIL tests/unit/listing-publish-rate-limit.test.ts
    ● listing-publish-rate-limit › anonymous IP publish attempts are blocked after low threshold

      expect(received).toBe(expected) // Object.is equality

      Expected: true
      Received: false

        51 |       }
        52 |     }
      > 53 |     expect(blocked).toBe(true);
           |                     ^
        54 |   });

  Test Suites: 1 failed, 118 passed, 119 total
  Tests:       1 failed, 804 passed, 805 total
  ```

- **Fișiere posibil relevante:** `lib/listing-publish-rate-limit.ts`, `lib/rate-limit-distributed.ts`
  (rate limiting distribuit, posibil backat de Redis, cu fallback in-memory — comportamentul poate
  fi sensibil la timing/mediu de execuție).

---

## 2. `/auth/login` — al doilea nod DOM `input[type="email"]`, doar client-side/post-hidratare

- **Status:** neinvestigat, independent de branch-ul curent
- **Descoperit în:** aceeași verificare pre-deploy SEO, rulare Playwright pe build de producție local
- **Descriere:** Testul `tests/e2e/predeploy-ui-smoke.spec.ts › login form renders` eșuează
  determinist (2/2 rulări) cu strict-mode violation: `locator('input[type="email"]')` găsește
  **2 elemente** în DOM după hidratare, deși vizual pagina arată un singur formular normal
  (confirmat din screenshot). HTML-ul randat pe server (SSR, `curl` direct) conține **un singur**
  `type="email"` — deci al doilea nod apare exclusiv client-side, în timpul/după hidratare.
- **Cum se reproduce:**
  1. Build de producție: `npm run build && PORT=3101 npx next start -p 3101`
  2. `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3101 npx playwright test tests/e2e/predeploy-ui-smoke.spec.ts -g "login form renders" --project=chromium`
- **Output exact din verificare:**

  ```
  Error: expect(locator).toBeVisible() failed
  Locator: locator('input[type="email"]')
  Expected: visible
  Error: strict mode violation: locator('input[type="email"]') resolved to 2 elements:
      1) <input ... placeholder="exemplu@email.com" .../> aka getByRole('textbox', { name: 'exemplu@email.com' })
      2) <input ... placeholder="exemplu@email.com" .../> aka getByPlaceholder('exemplu@email.com').nth(1)
  ```

- **Notă de investigație:** `app/components/LoginForm.tsx` conține un singur `type="email"` în
  sursă, iar `<LoginForm />` e randat o singură dată în `app/auth/login/page.tsx`. Nu are legătură
  cu niciun fișier modificat în PR-ul SEO curent (footer/hub-uri/`/about`). Ipoteză neconfirmată:
  posibil un câmp anti-bot/honeypot injectat client-side (proiectul are istoric de lucru pe
  bot-protection/Turnstile, vezi `docs/auth/TURNSTILE_REMOVAL.md`), cu același placeholder ca
  input-ul real — de verificat.
