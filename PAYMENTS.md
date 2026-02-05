# 💳 Sistem de Plăți - Documentație Completă

## 📋 Prezentare Generală

Platforma suportă plăți complete prin **Stripe** pentru promovarea anunțurilor, cu suport pentru:
- ✅ **Card** (Visa, Mastercard, Amex, etc.)
- ✅ **Apple Pay** (automat activat pe dispozitive Apple)
- ✅ **Google Pay** (automat activat în browsere compatibile)
- ✅ **Facturare automată** cu generare facturi după fiecare plată

---

## 🎯 Pachete de Promovare

### Pachete Disponibile

| Pachet | Preț | Durată | Descriere |
|--------|------|--------|-----------|
| `featured_7_days` | 29 RON | 7 zile | Anunț evidențiat în rezultate căutare |
| `featured_30_days` | 99 RON | 30 zile | Anunț evidențiat în rezultate căutare |
| `top_position_1_day` | 15 RON | 1 zi | Anunț pe prima poziție |
| `homepage_banner_7_days` | 149 RON | 7 zile | Banner pe homepage |

Prețurile includ **TVA 19%** (specific României).

---

## 🛠️ Setup Stripe

### 1. Creează Cont Stripe

1. Înregistrează-te pe [Stripe](https://dashboard.stripe.com/register)
2. Completează datele companiei (nume, CUI, adresă, cont bancar)
3. Activează plățile în **RON** (Settings → Payment methods)

### 2. Configurare API Keys

#### Test Mode (pentru development)

1. Mergi la [API Keys - Test Mode](https://dashboard.stripe.com/test/apikeys)
2. Copiază **Secret key** (începe cu `sk_test_...`)
3. Copiază **Publishable key** (începe cu `pk_test_...`)

#### Production Mode (pentru live)

1. Mergi la [API Keys - Live Mode](https://dashboard.stripe.com/apikeys)
2. Copiază **Secret key** (începe cu `sk_live_...`)
3. Copiază **Publishable key** (începe cu `pk_live_...`)

### 3. Configurare Webhook

Webhook-urile sunt necesare pentru a primi notificări când o plată reușește/eșuează.

#### Local Development (cu Stripe CLI)

```bash
# Instalează Stripe CLI
brew install stripe/stripe-cli/stripe

# Login în Stripe
stripe login

# Forward webhook events către server local
stripe listen --forward-to http://localhost:3000/api/payments/webhook

# Output: whsec_... (copiază acest secret)
```

#### Production

1. Mergi la [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. URL: `https://yourdomain.com/api/payments/webhook`
4. Selectează evenimente:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copiază **Signing secret** (începe cu `whsec_...`)

### 4. Adaugă în `.env`

```bash
# Stripe API Keys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## 🍎 Apple Pay Setup

Apple Pay este **activat automat** de Stripe când:
- User-ul folosește Safari pe iPhone/iPad/Mac
- Domeniul este verificat în Stripe

### Verificare Domeniu

1. Mergi la [Apple Pay Settings](https://dashboard.stripe.com/settings/payment_methods/apple_pay)
2. Adaugă domeniul tău: `yourdomain.com`
3. Stripe va verifica automat domeniul (prin fișier `.well-known`)

**Notă**: Apple Pay funcționează doar pe **HTTPS** (nu pe localhost HTTP).

---

## 🤖 Google Pay Setup

Google Pay este **activat automat** de Stripe când:
- User-ul folosește Chrome/Edge pe Android/Desktop
- Are Google Pay configurat în browser

**Nu necesită configurare specială** - Stripe se ocupă de tot!

---

## 📊 Fluxul de Plată

### 1. Creare PaymentIntent

```bash
POST /api/payments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "listingId": "listing-id",
  "packageType": "featured_7_days"
}
```

**Response:**
```json
{
  "paymentId": "payment-uuid",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 2900,
  "currency": "ron",
  "packageType": "featured_7_days"
}
```

### 2. Frontend - Stripe Elements

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

// Inițializare Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
      <button type="submit">Plătește</button>
    </Elements>
  );
}
```

**Stripe Elements include automat:**
- Card form (cu validare)
- Apple Pay button (pe dispozitive Apple)
- Google Pay button (în browsere compatibile)

### 3. Confirmare Plată

```typescript
const stripe = await stripePromise;
const { error } = await stripe.confirmPayment({
  clientSecret,
  confirmParams: {
    return_url: 'https://yourdomain.com/payment/success',
  },
});

if (error) {
  // Afișează eroare
  console.error(error.message);
}
```

### 4. Webhook - Confirmare Automată

Când plata reușește, Stripe trimite webhook la `/api/payments/webhook`:

1. **Verificare semnătură** (securitate)
2. **Update status payment** în DB (`succeeded`)
3. **Generare factură automată** (cu TVA 19%)
4. **Marcare factură ca plătită**
5. **Activare promovare listing** (dacă aplicabil)
6. **Audit log**

---

## 📄 Facturare Automată

### Generare Factură

După fiecare plată reușită, sistemul generează automat factură cu:

- **Număr factură**: Format `INV-2026-00001` (secvențial)
- **Detalii companie**: Preluate din Settings sau hardcodate
- **Detalii client**: Nume, email, adresă (opțional CUI pentru firme)
- **Items**: Descriere pachet, cantitate, preț unitar
- **TVA**: 19% (implicit pentru România)
- **Subtotal**: Preț fără TVA
- **Total**: Preț final cu TVA

### API Facturi

#### Get toate facturile user-ului

```bash
GET /api/invoices
Authorization: Bearer <jwt_token>

# Query params:
# - limit: număr maxim facturi (default: 50, max: 100)
```

**Response:**
```json
{
  "invoices": [
    {
      "id": "invoice-uuid",
      "invoiceNumber": "INV-2026-00001",
      "status": "paid",
      "amount": 2900,
      "currency": "RON",
      "subtotal": 2437,
      "vatAmount": 463,
      "vatRate": 19,
      "items": [
        {
          "description": "Promovare anunț - featured_7_days",
          "quantity": 1,
          "unitPrice": 2437,
          "vatRate": 19
        }
      ],
      "companyName": "Auto Platform SRL",
      "companyCui": "RO12345678",
      "companyAddress": "București, România",
      "clientName": "John Doe",
      "clientEmail": "john@example.com",
      "pdfUrl": null,
      "issuedAt": "2026-02-04T20:00:00Z",
      "paidAt": "2026-02-04T20:05:00Z",
      "dueAt": "2026-03-06T20:00:00Z",
      "createdAt": "2026-02-04T20:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get detalii factură

```bash
GET /api/invoices/{invoiceId}
Authorization: Bearer <jwt_token>
```

---

## 🧪 Testare

### Card-uri Test (Test Mode)

| Card Number | Scenariu | Descriere |
|-------------|----------|-----------|
| `4242 4242 4242 4242` | ✅ Success | Plată reușită |
| `4000 0000 0000 9995` | ❌ Declined | Card respins (fonduri insuficiente) |
| `4000 0000 0000 0002` | ❌ Declined | Card respins (generic) |
| `4000 0025 0000 3155` | 🔒 3D Secure | Autentificare 3D Secure necesară |

**Date card:**
- **Expiry**: Orice dată viitoare (ex: `12/34`)
- **CVC**: Orice 3 cifre (ex: `123`)
- **ZIP**: Orice cod poștal (ex: `12345`)

### Testare Webhook (Local)

```bash
# Terminal 1: Start server Next.js
npm run dev

# Terminal 2: Start Stripe CLI forward
stripe listen --forward-to http://localhost:3000/api/payments/webhook

# Terminal 3: Trigger test event
stripe trigger payment_intent.succeeded
```

### Verificare Logs

```bash
# Vezi toate payment-urile din DB
npx prisma studio

# Check logs în terminal (observability)
# Output JSON va arăta:
# - Payment created
# - Payment succeeded
# - Invoice created
# - Invoice marked as paid
```

---

## 🔒 Securitate

### Validări Backend

✅ **Rate limiting**: Max 10 plăți/oră per user  
✅ **Verificare ownership**: Doar owner-ul poate promova listing-ul său  
✅ **Verificare listing status**: Doar listing-uri `active` pot fi promovate  
✅ **Webhook signature**: Toate webhook-urile sunt verificate cu `STRIPE_WEBHOOK_SECRET`  
✅ **JWT authentication**: Toate endpoint-urile necesită autentificare  

### Recomandări

- **Nu stoca niciodată detalii card** în DB (Stripe se ocupă de asta)
- **Folosește HTTPS** în producție (obligatoriu pentru Apple Pay)
- **Rotează webhook secret** dacă este compromis
- **Monitorizează failed payments** în Stripe Dashboard
- **Activează Stripe Radar** pentru prevenirea fraudei

---

## 📈 Monitorizare

### Stripe Dashboard

- [Payments](https://dashboard.stripe.com/payments) - Vezi toate plățile
- [Disputes](https://dashboard.stripe.com/disputes) - Dispute/chargebacks
- [Radar](https://dashboard.stripe.com/radar) - Fraudă și risc
- [Webhooks](https://dashboard.stripe.com/webhooks) - Logs webhook-uri
- [Events](https://dashboard.stripe.com/events) - Toate evenimentele Stripe

### Logs Aplicație

```typescript
// lib/observability.ts - Toate operațiunile sunt logate
// Căutare logs:
grep "Payment created" logs/app.log
grep "Invoice created" logs/app.log
grep "Payment succeeded" logs/app.log
```

### Audit Log

Toate evenimentele de plată sunt înregistrate în `audit_logs`:

- `payment_succeeded` - Plată reușită
- `payment_failed` - Plată eșuată
- `payment_cancelled` - Plată anulată
- `payment_refunded` - Plată returnată (refund)

---

## 🚀 Producție

### Checklist Pre-Launch

- [ ] Switch Stripe la **Live Mode** (API keys `sk_live_...`)
- [ ] Configurare webhook producție (`https://yourdomain.com/api/payments/webhook`)
- [ ] Verificare domeniu pentru Apple Pay
- [ ] Testare plată reală cu card test
- [ ] Verificare primire webhook în producție
- [ ] Testare generare facturi
- [ ] Activare Stripe Radar (anti-fraud)
- [ ] Configurare alerting pentru failed payments
- [ ] Review Stripe dashboard setări (dispute, refunds, receipts)

### Troubleshooting

#### Webhook nu primește evenimente

1. Check webhook URL este corect în Stripe Dashboard
2. Verifică server acceptă POST requests la `/api/payments/webhook`
3. Check `STRIPE_WEBHOOK_SECRET` în `.env`
4. Vezi logs în Stripe Dashboard → Webhooks → Vezi încercări

#### Apple Pay nu apare

1. Verifică HTTPS (nu funcționează pe HTTP)
2. Verifică domeniul în [Apple Pay Settings](https://dashboard.stripe.com/settings/payment_methods/apple_pay)
3. Testează în Safari (nu Chrome/Firefox)

#### Factură nu se generează

1. Check logs backend: `grep "Invoice created" logs/app.log`
2. Verifică webhook a fost primit: check `payments` table → `status` = `succeeded`
3. Check `invoices` table în Prisma Studio

---

## 📞 Suport

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

## ✅ Status Implementare

- ✅ Stripe integration library (`lib/stripe.ts`)
- ✅ Payment models (Payment, Invoice în Prisma)
- ✅ Payment creation API (`POST /api/payments`)
- ✅ Webhook handler (`POST /api/payments/webhook`)
- ✅ Invoice generation system (`lib/invoice.ts`)
- ✅ Invoice APIs (`GET /api/invoices`, `GET /api/invoices/[id]`)
- ✅ Automatic invoice generation după plată
- ✅ Support pentru Card, Apple Pay, Google Pay
- ✅ TVA 19% calculation
- ✅ Audit logging
- ⏳ PDF generation (TODO - viitor)
- ⏳ Email notifications (TODO - viitor)

**Sistemul este complet funcțional și gata de testare!** 🎉
