# Stripe decline / error message audit (final, safe scope)

**Date:** May 2026  
**Scope:** Display path for promotion **card** checkout only — `app/listings/[id]/promote/payment/card/CardPaymentClient.tsx`.  
**Out of scope (untouched):** `create-intent`, webhook, Stripe env config, listing edit, auth, messaging, homepage, design refactors.

---

## 1. Was our UI wrongly mapping Stripe messages?

**No.**

| Location | Behaviour |
|----------|-----------|
| `CheckoutForm` after `elements.submit()` / `stripe.confirmPayment()` | On any failure, the **red box under the form** always shows the **fixed Romanian string**: `A apărut o eroare la procesarea plății`. It does **not** show `confirmError.message`, `decline_code`, or any English Stripe string. |
| Custom map | There is **no** map from `expired_card`, `incorrect_cvc`, `authentication_required`, `card_declined`, `processing_error`, etc. to Romanian or to “expired”. |
| Generic → “expired” | The generic message **never** contains the word “expired” or “expirat”. |

**Conclusion:** If the user sees **“Your card has expired”** (or similar English Stripe copy), that text comes from **Stripe Payment Element** (iframe / Stripe.js UI), **not** from our `setError()` state.

---

## 2. Does our code display `error.message` from Stripe anywhere on this page?

- **Below the form (`<p className="text-red-400">`):** **No** — only the generic Romanian string (see above).
- **Intent bootstrap errors** (failed `fetch('/api/payments/create-intent')`): the **parent** `CardPaymentClient` can show `e?.message` from the API JSON — that is **server** `error` strings (e.g. validation), **not** card decline messages from `confirmPayment`.

So **card decline / CVC / expiry messaging in English is Stripe-owned UI**, not our mapped copy.

---

## 3. Typical Stripe fields (reference — not captured live here)

When `stripe.confirmPayment` returns `{ error }`, the object is a **`StripeError`** with fields such as:

| Field | Meaning (high level) |
|-------|----------------------|
| `error.type` | e.g. `card_error`, `invalid_request_error`, `api_error` |
| `error.code` | e.g. `incorrect_cvc`, `expired_card`, `card_declined`, `processing_error`, … |
| `error.decline_code` | Issuer-oriented codes when `type` is card-related (e.g. `generic_decline`, `lost_card`, …) |
| `error.message` | Human-readable string (may **not** match `code` 1:1 with issuer behaviour) |
| `error.payment_intent?.last_payment_error` | Nested summary of the last failure on the PaymentIntent |

**We did not run live/test card charges in this audit**, so **no real `decline_code` / `code` pairs** from production are listed below. Use **dev-only logging** (section 5) while reproducing a decline locally to record actual values.

Common **codes** (Stripe docs — illustrative):

| Scenario (typical) | Often-related `code` / notes |
|--------------------|-----------------------------|
| Wrong CVC | `incorrect_cvc` |
| Expired card | `expired_card` |
| Invalid expiry | May surface as validation or card error depending on flow |
| 3DS needed | `authentication_required` |
| Generic issuer decline | `card_declined` + `decline_code` |

Issuer and network behaviour can still produce **user-facing `message` text that feels “wrong”** vs. what the user typed; that is a **Stripe/issuer** concern, not fixed by remapping without Dashboard evidence.

---

## 4. Code change in this audit (minimal)

**File modified:** `app/listings/[id]/promote/payment/card/CardPaymentClient.tsx`

**Change:** Added **`logStripePaymentDebug`** which runs **only when** `process.env.NODE_ENV === 'development'`.

It logs to `console.info` under the tag **`[stripe-payment-debug]`**:

- `phase`: `elements.submit` | `stripe.confirmPayment`
- `type`, `code`, `decline_code`, `message` from the `StripeError`
- `last_payment_error`: only **`type`**, **`code`**, **`decline_code`**, **`message`** (no full object / no payment method payloads)

**Production:** no extra logging (guard is strict `development` only).

**No** mapping fixes were applied — none were needed.

---

## 5. Manual verification (recommended before deploy)

1. Run **`next dev`** (`NODE_ENV=development`), open promotion card checkout, trigger a **declining** test card (only in **test** Stripe mode).
2. Open DevTools → Console, filter **`stripe-payment-debug`**, copy `code` / `decline_code` / `message` / `last_payment_error`.
3. Compare with **Stripe Dashboard → PaymentIntent → Logs** for the same intent.

---

## 6. Tests run

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run type-check` | Pass |
| `npm run build` | Pass |

---

## 7. Summary table

| Question | Answer |
|----------|--------|
| Was our UI the cause of “expired” vs wrong CVC? | **No** — we don’t map declines; our own error line is generic Romanian. |
| Was Stripe / issuer the likely source of English inline messages? | **Yes** — Payment Element shows Stripe’s copy. |
| What was modified? | **Dev-only structured logging** in `CardPaymentClient.tsx` only. |
| create-intent / webhook / config touched? | **No** |

---

## 8. Optional follow-up (product, not required for this audit)

- After collecting real `code` / `decline_code` from dev or Dashboard, decide if you want a **deliberate** user-facing map (Romanian) **below** the Element — that would be a separate, explicit product change (still only in this component, no API).
