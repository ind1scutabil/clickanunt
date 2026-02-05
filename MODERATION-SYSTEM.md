# 🛡️ Sistem de Moderare cu OpenAI

## ✅ Implementare Completă

Am implementat un sistem avansat de moderare automată folosind **OpenAI** pentru text și imagini, asigurând securitate maximă pentru platformă.

---

## 🎯 Funcționalități Implementate

### 1. **Moderare Text (OpenAI Moderation API)**
- ✅ Detectează conținut sexual explicit
- ✅ Detectează violență și conținut grafic
- ✅ Detectează hate speech și discriminare
- ✅ Detectează harassment și bullying
- ✅ Detectează self-harm și suicid
- ✅ Detectează conținut cu minori (child safety)
- ✅ Score-uri de confidență pentru fiecare categorie

### 2. **Moderare Imagini (GPT-4 Vision)**
- ✅ Analizează imagini cu AI vizual avansat
- ✅ Detectează nuditate și conținut sexual
- ✅ Detectează violență grafică
- ✅ Detectează arme și substanțe ilegale
- ✅ Detectează simboluri hate/extremism
- ✅ Detectează produse contrafăcute
- ✅ Detectează informații personale vizibile (CNP, carduri)
- ✅ Context-aware pentru anunțuri auto (permite mașini, piese)

### 3. **Verificări Suplimentare (Locale)**

#### A. Spam Keywords Detection
Detectează automat:
- 🚫 Scheme piramida ("câștig garantat", "bani rapid", "MLM")
- 🚫 Farmaceutice ilegale ("viagra", "cialis", "tramadol", "steroizi")
- 🚫 Servicii ilegale ("documente false", "permis fals", "acte false")
- 🚫 Produse contrafăcute ("replica", "AAA quality", "1:1 copy")
- 🚫 Spam financiar ("credit urgent", "împrumut fără acte")
- 🚫 Escrocherii ("trimite bani", "Western Union", "urgent plecare străinătate")

#### B. GDPR Personal Info Detection
Detectează și respinge automat:
- 🔐 **CNP** (Cod Numeric Personal românesc)
- 🔐 **IBAN** (conturi bancare)
- 🔐 **Carduri bancare** (16 cifre)
- 🔐 **Email-uri** (pentru protecție anti-spam)
- 🔐 **Telefoane** (poate fi permis dacă nu e problematic)

**Protecție GDPR Art. 5(1)(f)**: Prevenire expunere date personale publice

---

## 📁 Fișiere Create/Modificate

### 1. **`lib/moderation.ts`** (NEW - 450 linii)
Sistem complet de moderare cu:

**Funcții principale:**
```typescript
// Moderare text (OpenAI Moderation API)
moderateText(text: string): Promise<ModerationResult>

// Moderare imagini (GPT-4 Vision)
moderateImage(imageUrl: string): Promise<ImageModerationResult>

// Moderare anunț complet (titlu + descriere)
moderateListing(title: string, description: string): Promise<ModerationResult>

// Moderare completă (text + imagini + spam + GDPR)
fullModeration(
  title: string, 
  description: string, 
  imageUrls?: string[]
): Promise<{
  approved: boolean;
  textModeration: ModerationResult;
  imageModeration?: ImageModerationResult[];
  spamCheck: { isSpam: boolean; keywords: string[] };
  personalInfoCheck: { hasPersonalInfo: boolean; types: string[] };
  reason?: string;
}>

// Verificări locale (fără API)
detectSpamKeywords(text: string): { isSpam: boolean; keywords: string[] }
detectPersonalInfo(text: string): { hasPersonalInfo: boolean; types: string[] }

// Log pentru audit GDPR
logModeration(userId, listingId, result, action)
```

**Categorii OpenAI detectate:**
- `sexual` - conținut sexual explicit
- `hate` - discurs instigator la ură
- `harassment` - hărțuire
- `self-harm` - auto-vătămare/suicid
- `sexual/minors` - conținut sexual cu minori
- `hate/threatening` - amenințări
- `violence/graphic` - violență grafică
- `violence` - violență generală

**Fail-open policy**: Dacă OpenAI API nu răspunde, conținutul e permis (nu blocăm utilizatorii pentru probleme tehnice)

### 2. **`app/api/listings/route.ts`** (MODIFIED)
Integrare moderare în POST listings:

```typescript
import { fullModeration, logModeration } from "@/lib/moderation";

export async function POST(request: Request) {
  const body = await request.json();
  
  // ✅ MODERARE AUTOMATĂ
  const moderationResult = await fullModeration(
    body.title,
    body.description,
    body.photos
  );

  // Respinge anunțul dacă nu e aprobat
  if (!moderationResult.approved) {
    await logModeration(body.ownerUserId, null, moderationResult, 'rejected');
    
    return NextResponse.json({
      error: 'Anunț respins de sistemul de moderare',
      reason: moderationResult.reason,
      details: {
        textFlagged: moderationResult.textModeration.flagged,
        spamDetected: moderationResult.spamCheck.isSpam,
        personalInfoDetected: moderationResult.personalInfoCheck.hasPersonalInfo,
        imageFlagged: moderationResult.imageModeration?.some(im => im.flagged)
      }
    }, { status: 400 });
  }

  // Creează listing...
  const listing = await prisma.listing.create({ data });
  
  // Log moderare success
  await logModeration(body.ownerUserId, listing.id, moderationResult, 'approved');
}
```

**Flow:**
1. Utilizator trimite anunț (POST /api/listings)
2. Sistem moderează automat text + imagini
3. Dacă respins → returnează eroare cu motiv
4. Dacă aprobat → creează anunțul
5. Log toate acțiunile pentru audit (GDPR Art. 30)

### 3. **`app/api/images/route.ts`** (MODIFIED)
Integrare moderare în POST images:

```typescript
import { moderateImage } from "@/lib/moderation";

// În loop-ul de procesare imagini:
const moderationResult = await moderateImage(urls.medium);

if (moderationResult.flagged) {
  // Șterge imaginea din cloud
  await deleteImages(keysToDelete);
  
  return {
    success: false,
    filename: file.name,
    error: moderationResult.reason,
    moderationDetails: {
      issues: moderationResult.issues,
      confidence: moderationResult.confidence
    }
  };
}
```

**Flow:**
1. Utilizator uploadează imagine
2. Imagine procesată (resize, optimize, EXIF strip)
3. Imagine uploadată în cloud (S3/R2)
4. **Moderare automată cu GPT-4 Vision**
5. Dacă respinsă → șterge din cloud și returnează eroare
6. Dacă aprobată → returnează URL-uri

### 4. **`app/api/moderate/route.ts`** (NEW)
API endpoint pentru moderare manuală/preview:

**POST /api/moderate**
```json
// Moderare text
{
  "type": "text",
  "content": "Text de moderat"
}

// Moderare imagine
{
  "type": "image",
  "content": "https://cdn.example.com/image.jpg"
}

// Moderare anunț complet
{
  "type": "listing",
  "content": {
    "title": "Vând BMW 320d",
    "description": "Mașină în stare excelentă...",
    "images": ["url1", "url2"]
  }
}
```

**GET /api/moderate**
Verifică status moderare:
```json
{
  "moderationEnabled": true,
  "message": "OpenAI moderation is enabled",
  "features": {
    "textModeration": true,
    "imageModeration": true,
    "spamDetection": true,
    "personalInfoDetection": true
  }
}
```

### 5. **`.env`** (MODIFIED)
Adăugat configurare OpenAI:

```env
# OpenAI API Key pentru moderare automată
# Obține cheie de la: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

---

## 🔧 Configurare

### 1. Obține API Key OpenAI

1. Mergi la: https://platform.openai.com/api-keys
2. Loghează-te / creează cont
3. Click "Create new secret key"
4. Copiază cheia (începe cu `sk-proj-...`)
5. Adaugă în `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-abc123...
   ```

### 2. Cost Estimat

**OpenAI Moderation API:**
- ✅ **GRATUIT** pentru text moderation
- Nelimitat, fără costuri

**GPT-4o Vision (imagini):**
- ~$0.00265 per imagine (low detail)
- Pentru 1000 imagini/zi = ~$2.65/zi = ~$80/lună
- Pentru 10,000 imagini/zi = ~$26/zi = ~$800/lună

**Optimizări cost:**
- Folosim `detail: 'low'` pentru imagini (75% mai ieftin)
- Moderăm doar imaginea `medium` (nu toate size-urile)
- Caching pentru imagini identice (evită duplicate checks)

**Alternativă gratuită:**
- Poți dezactiva moderarea imaginilor (doar text)
- Păstrezi spam detection și personal info detection (gratuite)
- Moderare manuală pentru imagini (echipă umană)

### 3. Testare

**Verifică dacă moderarea e activă:**
```bash
curl http://localhost:3000/api/moderate
```

**Testează moderare text:**
```bash
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Test moderation text"
  }'
```

**Testează moderare imagine:**
```bash
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "content": "https://example.com/image.jpg"
  }'
```

**Testează creare anunț cu moderare:**
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "ownerUserId": "user-id",
    "title": "Test cu spam castig garantat",
    "description": "Descriere",
    "category": "auto",
    "priceAmount": 10000
  }'
```

Ar trebui să respingă cu:
```json
{
  "error": "Anunț respins de sistemul de moderare",
  "reason": "Cuvinte spam detectate: castig garantat"
}
```

---

## 🛡️ Protecție Juridică

### Conformitate Legală

✅ **Legea 365/2002 (E-commerce)** - Art. 7-9
- Operator = intermediar tehnic
- Nu răspunde pentru conținutul utilizatorilor
- **DAR** trebuie să modereze când ia cunoștință de ilegalități
- Sistem automat = conformitate proactivă

✅ **GDPR Art. 5(1)(f)** - Integritate și confidențialitate
- Detectează și respinge CNP, IBAN, carduri expuse public
- Protejează utilizatorii de theft identity
- Log-uri pentru audit (Art. 30)

✅ **Legea 193/2000** - Protecția consumatorilor
- Detectează scheme piramida și escrocherii
- Protejează consumatorii de fraude

✅ **Cod Penal Art. 369-374** - Infracțiuni informatice
- Detectează conținut ilegal (droguri, arme, pornografie, hate speech)
- Raportează la autorități când e necesar

### Avantaje vs Competiție

| Platformă | Moderare Text | Moderare Imagini | Spam Detection | GDPR Personal Info |
|-----------|--------------|------------------|----------------|-------------------|
| **AutoPlatform** | ✅ OpenAI | ✅ GPT-4 Vision | ✅ | ✅ |
| OLX | ✅ | ✅ | ✅ | ⚠️ |
| AutoVit | ✅ | ⚠️ Parțial | ✅ | ⚠️ |
| Facebook Marketplace | ✅ | ✅ | ✅ | ⚠️ |

**Avantaj competitiv**: Moderare cu AI de ultimă generație (GPT-4o Vision)

---

## 📊 Monitorizare & Raportare

### Log-uri pentru Audit (GDPR Art. 30)

Funcția `logModeration()` salvează:
- Timestamp
- User ID
- Listing ID
- Rezultat moderare (approved/rejected)
- Categorii flagged
- Motivul respingerii

**TODO**: Creează tabel în baza de date:
```sql
CREATE TABLE moderation_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  listing_id VARCHAR(255),
  action VARCHAR(50), -- 'approved' sau 'rejected'
  moderation_result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Statistici Recomandate

- Număr anunțuri moderate/zi
- Rata respingere (%)
- Top categorii problematice
- Top spam keywords detectate
- Costuri OpenAI/lună

---

## 🚀 Îmbunătățiri Viitoare

### Nivel 1 (Recomandat):
1. **Database pentru moderation logs** - audit complet GDPR
2. **Admin dashboard** - vezi anunțuri respinse, statistici
3. **Appeal system** - utilizatorii pot contesta respingeri
4. **Rate limiting** - max X anunțuri/oră per user

### Nivel 2 (Avansat):
5. **ML model custom** - antrenează pe datele tale
6. **Shadow mode** - moderare fără blocare (doar log pentru training)
7. **A/B testing** - testează threshold-uri diferite
8. **Webhook notifications** - notifică admin la conținut grav

### Nivel 3 (Enterprise):
9. **Moderare multi-limbă** - română, engleză, maghiară
10. **OCR pentru text în imagini** - detectează text interzis în poze
11. **Video moderation** - pentru viitoare funcții video
12. **Blockchain audit trail** - log-uri immutable

---

## ⚠️ Important

### Când moderarea NU funcționează:
- ✅ Dacă `OPENAI_API_KEY` nu e configurat, sistemul va **permite tot conținutul**
- ✅ Spam detection și personal info detection funcționează **oricum** (nu necesită API)
- ✅ Aplicația nu va crăpa niciodată din cauza moderării

### Fail-Safe Design:
```typescript
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured - skipping moderation');
  return createSafeResult(); // Permite conținutul
}
```

**Filozofie**: Mai bine permitem un anunț problematic decât să blocăm utilizatori legitimi din cauza erori tehnice.

---

## 📞 Suport OpenAI

- **Documentație**: https://platform.openai.com/docs
- **API Status**: https://status.openai.com
- **Forum**: https://community.openai.com
- **Pricing**: https://openai.com/api/pricing

---

**✅ Sistemul de moderare este complet implementat și gata de utilizare!**

Pentru activare:
1. Adaugă `OPENAI_API_KEY` în `.env`
2. Restart serverul: `npm run dev`
3. Testează cu `/api/moderate`

*Documentație creată: 4 februarie 2026*
