# 📧 Configurare Rapidă Gmail SMTP

## 🚀 Mod Development (Activ Acum)

**Status**: Emailurile NU sunt trimise - codul apare direct în pagina de verificare!

### Cum Funcționează:
1. Creezi cont → Codul apare în mesajul de succes
2. Ești redirectat automat → Codul se auto-completează
3. Apeși "Verifică Email" → Gata! ✅

**Nu e nevoie de email în development!**

---

## 📨 Configurare Gmail Pentru Emailuri Reale

### Pas 1: Activează 2-Step Verification

1. Mergi la: https://myaccount.google.com/security
2. Click pe "2-Step Verification"
3. Urmează pașii pentru activare

### Pas 2: Generează App Password

1. Mergi la: https://myaccount.google.com/apppasswords
2. Selectează:
   - **App**: Mail
   - **Device**: Other (Custom name) → scrie "ClickAnunț"
3. Click "Generate"
4. **Copiază parola** (16 caractere, format: `xxxx xxxx xxxx xxxx`)

### Pas 3: Configurează .env

Editează `/Users/ind1scutabil/projects/auto-platform/.env`:

```bash
# Înlocuiește aceste valori:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tauemaildegmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App Password de la Pas 2
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

### Pas 4: Restart Server

```bash
# În terminal:
pkill -9 -f next && npm run dev
```

### Pas 5: Testează

Creează un cont nou → Vei primi email real în inbox!

---

## ⚡ Test Rapid Gmail

```bash
# 1. Configurează .env cu credențialele tale Gmail
# 2. Restart server
# 3. Rulează:

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tauemaildegmail@gmail.com",
    "password": "parola123456",
    "role": "user"
  }'

# 4. Verifică inbox-ul Gmail → Ar trebui să primești emailul!
```

---

## 🔍 Verificare Status

### Cum știi dacă ești în MOCK mode:

În terminal vei vedea:
```
⚠️  Email service in MOCK mode - emailurile nu vor fi trimise efectiv
📧 MOCK EMAIL: { to: 'user@example.com', ... }
```

### Cum știi dacă Gmail SMTP funcționează:

În terminal vei vedea:
```
✅ Email de verificare trimis: { 
  to: 'user@example.com', 
  messageId: '<xxxx@gmail.com>',
  response: '250 2.0.0 OK ...'
}
```

---

## 🆘 Probleme Comune

### "Invalid credentials"
- **Cauză**: Parola greșită sau nu ai activat 2-Step Verification
- **Soluție**: Regenerează App Password

### "Less secure app access"
- **Cauză**: Gmail blochează aplicații nesecurizate
- **Soluție**: Folosește App Password (nu parola normală!)

### "Daily sending quota exceeded"
- **Cauză**: Gmail are limită de ~100-500 emailuri/zi pentru conturi normale
- **Soluție**: Așteaptă 24h sau folosește SendGrid/Mailgun pentru volume mari

### Emailul ajunge în Spam
- **Cauză**: Domeniul nu are SPF/DKIM configurat
- **Soluție**: Pentru production, configurează domeniul corect sau folosește serviciu profesional

---

## 🎯 Pentru Production (Recomandat)

### SendGrid (Gratuit până la 100 emailuri/zi)

1. Cont: https://sendgrid.com
2. Generează API Key
3. Configurează:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx  # API Key
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"
```

**Avantaje**:
- ✅ Limită mai mare (100/zi gratuit)
- ✅ Statistici detaliate
- ✅ Nu ajung în spam
- ✅ Professional

---

## 📊 Status Actual

**Configurație Actuală**: Development Mode (MOCK)
- ❌ Emailurile NU sunt trimise
- ✅ Codul apare direct în UI
- ✅ Perfect pentru testare

**Pentru Emailuri Reale**:
1. Configurează Gmail SMTP (pașii de mai sus)
2. Restart server
3. Done! 🎉

---

**💡 TIP**: În development, sistemul actual este perfect - nu e nevoie de email! Codul apare automat în UI.
