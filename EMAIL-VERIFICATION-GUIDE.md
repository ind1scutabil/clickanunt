# 📧 Sistem de Verificare Email - Configurare

## ✅ Ce Am Implementat

### 1. **Serviciu de Email** (`lib/email.ts`)
- ✅ Trimitere automată de email la înregistrare
- ✅ Template HTML premium pentru email
- ✅ Generare token de verificare (32 caractere)
- ✅ Generare cod de 6 cifre pentru verificare manuală
- ✅ Email de bun venit după verificare
- ✅ Mock mode pentru development (nu trimite emailuri reale)

### 2. **API Endpoints**
- ✅ `POST /api/users` - Creare cont + trimitere email verificare
- ✅ `POST /api/auth/verify-email` - Verificare email cu token sau cod
- ✅ `PUT /api/auth/verify-email` - Re-trimitere email de verificare

### 3. **Pagină de Verificare** (`/auth/verify-email`)
- ✅ Intrare cod manual (6 cifre)
- ✅ Verificare automată din link
- ✅ Buton re-trimitere email
- ✅ Design premium consistent

### 4. **Bază de Date**
- ✅ Câmpuri noi în User:
  - `emailVerified` - Status verificare
  - `verificationToken` - Token unic de verificare
  - `verificationCode` - Cod de 6 cifre
  - `verificationTokenExpiry` - Data expirare (24 ore)

---

## 🚀 Mod de Utilizare

### Flow-ul Complet:

1. **Utilizator se înregistrează** → `POST /api/users`
2. **Sistem generează**:
   - Token unic: `a3f9d2e8c4b1...` (32 caractere)
   - Cod: `123456` (6 cifre)
   - Link: `http://localhost:3000/auth/verify-email?token=xxx&email=xxx`
3. **Email trimis automat** cu:
   - Codul de 6 cifre (vizibil în email)
   - Buton "Verifică Email-ul Acum" (cu link + token)
4. **Utilizator poate**:
   - Click pe butonul din email → verificare automată
   - SAU introdu codul manual pe pagina de verificare
5. **După verificare**:
   - `emailVerified` = `true`
   - Email de bun venit trimis
   - Redirect către login

---

## ⚙️ Configurare SMTP

### Pentru Development (Mock Mode - Implicit)

**Nu trebuie configurat nimic!** Emailurile vor fi loguite în consolă fără a fi trimise.

```bash
# .env - Lasă gol pentru mock mode
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

Când rulezi, vei vedea în consolă:
```
⚠️  Email service in MOCK mode - emailurile nu vor fi trimise efectiv
📧 MOCK EMAIL: { to: 'user@example.com', subject: '✉️ Verifică-ți...' }
```

---

### Pentru Production - Configurare SMTP Real

#### Opțiunea 1: Gmail (Gratuit)

1. **Activează "2-Step Verification"** în contul Google
2. **Generează App Password**:
   - Mergi la: https://myaccount.google.com/apppasswords
   - Selectează "Mail" și "Other device"
   - Copiază parola generată (16 caractere)

3. **Configurare `.env`**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tauemaildegmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App Password
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

#### Opțiunea 2: SendGrid (Profesional)

1. Creează cont pe [SendGrid](https://sendgrid.com)
2. Generează API Key
3. Configurare:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxx  # API Key
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

#### Opțiunea 3: Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tudomeniu.com
SMTP_PASS=your-mailgun-password
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

#### Opțiunea 4: AWS SES (Scalabil)

```bash
SMTP_HOST=email-smtp.eu-west-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=your-ses-smtp-password
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

---

## 🧪 Testare

### 1. Test Creare Cont + Email

```bash
# Crează un cont nou
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "parola12345",
    "role": "user"
  }'

# Răspuns așteptat:
{
  "id": "user-xxx",
  "email": "test@example.com",
  "role": "user",
  "emailVerified": false,
  "message": "Cont creat cu succes! Verifică-ți emailul pentru a activa contul."
}
```

### 2. Test Verificare cu Cod

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# Răspuns așteptat:
{
  "success": true,
  "message": "Email verificat cu succes! Contul tău este acum activ."
}
```

### 3. Test Re-trimitere Email

```bash
curl -X PUT http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## 📋 Checklist Deployment Live

- [ ] **Configurează SMTP** în `.env` (Gmail, SendGrid, etc.)
- [ ] **Setează domeniul corect** în `NEXT_PUBLIC_BASE_URL`
- [ ] **Testează trimiterea emailurilor** în production
- [ ] **Verifică spam folder** - asigură-te că emailurile ajung în inbox
- [ ] **Configurează SPF/DKIM** pentru domeniul tău (evită spam)
- [ ] **Adaugă logo** în template email (opțional)
- [ ] **Personalizează mesajele** din template

---

## 🎨 Personalizare Template Email

Editează `/lib/email.ts`, funcția `getVerificationEmailTemplate()`:

```typescript
// Schimbă culorile
background: linear-gradient(135deg, #TUA_CULOARE1 0%, #TUA_CULOARE2 100%);

// Adaugă logo
<img src="https://clickanunt.ro/logo.png" alt="Logo" style="height: 50px;">

// Modifică textul
<p>Mesajul tău personalizat aici...</p>
```

---

## 🔐 Securitate

✅ **Implementat**:
- Token unic de 32 caractere (criptografic sigur)
- Expirare automată după 24 ore
- Cod de 6 cifre pentru verificare alternativă
- Hash-uri bcrypt pentru parole
- HTTPS recomandat pentru production

⚠️ **Recomandări**:
- Folosește HTTPS în production
- Configurează rate limiting pentru re-trimitere
- Monitorizează încercările de verificare eșuate
- Adaugă CAPTCHA pentru signup (opțional)

---

## 📊 Monitorizare

### Log-uri în Development:
```
✅ Email de verificare trimis: { to: 'user@example.com', messageId: 'xxx' }
📧 MOCK EMAIL: { to: 'user@example.com', subject: '✉️ Verifică...' }
```

### Log-uri în Production:
```
✅ Email de verificare trimis către: user@example.com
✅ Email de bun venit trimis către: user@example.com
❌ Eroare la trimiterea emailului: Connection timeout
```

---

## 🆘 Troubleshooting

### Problema: "Email nu ajunge"

**Soluții**:
1. Verifică folder-ul Spam
2. Verifică configurația SMTP în `.env`
3. Testează conexiunea SMTP:
```bash
telnet smtp.gmail.com 587
```
4. Verifică log-urile server pentru erori

### Problema: "Token invalid"

**Cauze**:
- Token expirat (>24 ore)
- Token incorect
- User deja verificat

**Soluție**: Folosește endpoint-ul de re-trimitere (`PUT /api/auth/verify-email`)

### Problema: "Mock mode în production"

**Cauză**: Variabilele SMTP nu sunt setate în `.env`

**Soluție**: Adaugă credențialele SMTP complete

---

## 🎉 Rezultat Final

### Email Primit:
- ✅ Design premium cu gradient violet-albastru
- ✅ Cod de 6 cifre vizibil și ușor de copiat
- ✅ Buton mare "Verifică Email-ul Acum"
- ✅ Link alternativ pentru copy-paste
- ✅ Mesaje de securitate și expirare
- ✅ Footer cu link-uri către site

### Experiență Utilizator:
1. **Signup** → Mesaj: "Verifică-ți emailul"
2. **Email primit** → Cod: `123456` + Buton click
3. **Click buton** → Verificare automată → Success!
4. **Redirect** → Login → Cont activ ✅

---

**🚀 Gata de folosit! Sistemul de verificare email este complet funcțional!**
