# Billing / Receipt / Invoice Audit (May 2026)

**Scope:** Stripe receipts, public contact data, internal invoices, centralized billing.  
**Constraints respected:** `create-intent` route, webhook handler logic, payment confirmation flow, Stripe Elements, DB schema, and auth were **not** edited in this pass.

---

## A. Stripe Dashboard vs application (receipt email & phone)

### Where Stripe shows business/support details

| Setting | Stripe Dashboard path (typical) | Effect on receipts |
|--------|----------------------------------|---------------------|
| **Business / public business info** | Settings → **Business settings** (or **Public business information**) | Name, address, support URL, **customer-facing email**, **phone** on receipts and hosted pages |
| **Branding** | Settings → **Branding** | Logo, accent color, custom domain for Checkout/hosted invoice pages (if used) |
| **Statement descriptor** | Settings → **Public details** / Payments → **Statement descriptor** (short + optional prefix) | Appears on **card statements**, not usually the full receipt body |
| **`receipt_email` on PaymentIntent** | Set only via API (this app: `lib/stripe.ts`) | **Recipient** of Stripe’s automated payment receipt email |

### Source of `daniel.enoiu29@gmail.com` on Stripe receipts (before fix)

- **Not** hardcoded in `receipt_email` in the repo.
- **Application behavior:** `createPaymentIntent` was called with `customerEmail: customerEmail || user?.email` from API routes; `lib/stripe.ts` passed that value to Stripe as `receipt_email`. If the listing owner’s account email in the database was `daniel.enoiu29@gmail.com`, **Stripe sent the receipt to that address**.
- **Also appears in code** as admin/dev identity (not used for Stripe receipts): `lib/auth/login-shared.ts`, `prisma/seed-listings.ts`, `scripts/debug-login.ts`, `scripts/test-password.ts` — **unchanged** (auth/seed scope).

### Source of `+40 784…` on Stripe receipts

- **Most likely:** Stripe Dashboard **business / public support phone** (or legacy account profile fields), because PaymentIntents created here do **not** set a receipt phone field in code.
- **Also hardcoded in app** (public site / SEO / samples — not sent to Stripe API for receipts): see section B.

---

## B. Codebase search results

| Pattern | Locations | Notes |
|--------|-----------|--------|
| `daniel.enoiu29@gmail.com` | `lib/auth/login-shared.ts`, `prisma/seed-listings.ts`, `scripts/debug-login.ts`, `scripts/test-password.ts`, various `*.md` reports | Admin/dev; not Stripe `receipt_email` |
| `+40 784` / `+40784712496` | **Fixed/removed from:** `lib/seo.ts`, `app/business/page.tsx`, `lib/memory-storage.ts`. **Still in:** `README.md`, `docs/deployment/DEPLOYMENT.md`, `docs/architecture/LEGAL-COMPLIANCE.md`, `app/components/Navbar.old.tsx` (unused import in codebase) | Update docs/old files manually if you want zero references |
| `receipt_email` | `lib/stripe.ts` only | Now uses billing inbox (see D) |
| `support@` / `billing@` | `lib/company-config.ts`, `app/contact/page.tsx`, `app/terms/page.tsx`, `app/rambursari/page.tsx`, `app/dashboard/account/page.tsx`, etc. | Centralized company emails |
| `invoice@` | No matches | N/A |
| Stripe hosted **`stripe.invoices` API** | No usage | Invoices are **in-app** (Prisma), not Stripe Invoices |

---

## C. Invoice / factură (Stripe vs platform)

- **Stripe Invoices (hosted PDF in Stripe):** **Not** used — no `stripe.invoices.create` (or similar) in the repository.
- **Platform invoices:** On `payment_intent.succeeded`, the webhook (`app/api/payments/webhook/route.ts`) calls `createInvoice` / `markInvoiceAsPaid` from `@/lib/invoice` and attempts `sendInvoiceEmail` / `sendPaymentConfirmationEmail` via `@/lib/invoice-mailer` when SMTP is configured.
- **Why users might “only see Stripe receipt”:** If **SMTP** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) is missing or misconfigured, `isMailerConfigured()` fails and **invoice/confirmation emails are not sent** — only Stripe’s receipt (and now to the centralized billing address; see D).
- **Tax / business profile:** Company legal data lives in `lib/company-config.ts` (CUI, VAT, IBAN). Stripe Tax / Stripe business profile for EU VAT on Stripe invoices is **out of scope** for this codebase path because Stripe Invoices are not emitted here.

---

## D. Minimal code changes (this PR)

1. **`lib/stripe.ts`**  
   - `receipt_email` is set to `process.env.STRIPE_RECEIPT_EMAIL` if set, otherwise **`COMPANY_CONFIG.emails.billing`** (`billing@clickanunt.ro`).  
   - Callers may still pass `customerEmail` for API compatibility; it is **no longer** used for Stripe receipts (avoids personal owner emails on Stripe receipt without touching `create-intent`).

2. **`lib/seo.ts`**  
   - Removed hardcoded `+40-784-712-496` from Organization and LocalBusiness JSON-LD.  
   - **`NEXT_PUBLIC_COMPANY_PHONE`** (optional): if set and legal details are public, `telephone` is included; otherwise omitted.

3. **`app/business/page.tsx`**  
   - Removed hardcoded personal mobile.  
   - If `NEXT_PUBLIC_COMPANY_PHONE` is set and legal details are shown → `tel:` button.  
   - If legal details are shown but no env phone → **`mailto:`** `support@clickanunt.ro` with label “Suport email”.

4. **`lib/memory-storage.ts`**  
   - Dev sample listing phone replaced with a **generic** placeholder (not a real subscriber number).

5. **`.env.example`**  
   - Documented `STRIPE_RECEIPT_EMAIL` and `NEXT_PUBLIC_COMPANY_PHONE`.

**Not changed:** `app/api/payments/create-intent/route.ts`, `app/api/payments/webhook/route.ts`, payment status transitions, Elements, listing edit, auth, messaging, admin.

---

## E. Manual Stripe Dashboard checklist (required for live alignment)

1. **Settings → Business / Public business information**  
   - Set **customer support email** to `support@clickanunt.ro` or `billing@clickanunt.ro`.  
   - Remove or replace **personal phone** with a company line, or leave empty if policy allows.

2. **Settings → Branding**  
   - Confirm logo and colors; optional custom domain if you use hosted Stripe pages.

3. **Payments → Statement descriptor**  
   - Use a recognizable business name (e.g. `CLICKANUNT` / agreed bank descriptor); avoids cardholder confusion.

4. **Tax / Stripe Invoices**  
   - If you need **official Stripe-generated EU invoices**, that is a **separate product decision** (Stripe Invoices + Tax). Current app issues **internal** invoices + email when SMTP works.

---

## F. Commands run

From repository root (all **exit code 0**):

- `npm run lint` — passed (`eslint . --max-warnings=0`).
- `npm run type-check` — passed (`tsc --noEmit`).
- `npm run build` — completed successfully; Next.js reported pre-existing webpack warning (OpenTelemetry / Sentry dynamic import trace), unrelated to billing changes.

---

## G. Final verification checklist (post-deploy, when you choose to deploy)

- [ ] Place a **small test payment** in Stripe test mode (or staging) and confirm receipt arrives at **`billing@clickanunt.ro`** (or `STRIPE_RECEIPT_EMAIL` override).
- [ ] Stripe receipt footer shows **company** support email/phone from Dashboard, not personal.
- [ ] With SMTP configured on the environment, confirm **invoice email** and **payment confirmation** reach the **buyer** (`payment.user.email`) from the webhook path.
- [ ] `NEXT_PUBLIC_COMPANY_PHONE` set in production only if you want a public number in JSON-LD and on `/business`.

**No deploy was performed** as part of this audit unless you explicitly confirm production rollout.
