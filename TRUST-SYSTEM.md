# 🛡️ Trust & Anti-Scam System - Complete Implementation

## Overview

Sistem complet de reputație și prevenție fraudă, implementat pentru a proteja utilizatorii platformei de înșelătorii și conținut malițios.

## ✅ Features Implementate

### 1. Trust Score System (0-100)

**Fișier:** `lib/trustScore.ts`

#### Trust Levels
- **VERIFIED (90+)** - Utilizatori verificați
  - ✅ Publicare instant, fără moderare
  - 50 anunțuri/zi
  - 100 mesaje/oră
  - Badge verde cu check mark
  
- **TRUSTED (70+)** - De încredere
  - Fast-track moderation
  - 20 anunțuri/zi
  - 50 mesaje/oră
  - Badge albastru cu scut
  
- **NEUTRAL (50+)** - Standard
  - Moderare normală
  - 10 anunțuri/zi
  - 20 mesaje/oră
  - Badge portocaliu
  
- **SUSPICIOUS (30+)** - Limitat
  - Moderare strictă
  - 3 anunțuri/zi
  - 10 mesaje/oră
  - Badge roșu
  
- **BANNED (0-29)** - Suspendat
  - 0 acțiuni permise
  - Badge gri

#### Calculul Scorului

```typescript
calculateTrustScore(factors: TrustFactors): number
```

**Factori:**
- ✅ Email verificat (obligatoriu, -30 dacă nu)
- 📱 Telefon verificat (+15 puncte)
- 📅 Vechime cont (până la +10 puncte)
- 📦 Anunțuri completate (+2 puncte/anunț, max +15)
- ✅ Tranzacții reușite (+3 puncte/tranzacție, max +15)
- ⭐ Review-uri pozitive (până la +10 puncte)
- ⚠️ Rapoarte primite (-5 puncte/raport)
- 🚨 Activitate suspicioasă (-10 puncte/flag)
- ❌ Încercări eșuate login (-8 puncte/încercare)
- 👎 Review-uri negative (-3 puncte/review)

#### Rate Limits Adaptive

Limitele sunt calculate automat pe baza trust score:

```typescript
getRateLimit(trustScore): {
  listingsPerDay: number,
  messagesPerHour: number,
  reportsPerDay: number,
  moderationBypass: boolean
}
```

### 2. Scam Detection System

**Fișier:** `lib/scamDetection.ts`

#### Detection Types

##### A. Suspicious Keywords (30+ patterns)
- **Payment scams:** Western Union, gift card, Bitcoin only, advance payment
- **Urgency tactics:** urgent sale, must sell today, act fast
- **Too good to be true:** 50% off, 90% off, free iPhone
- **External contact:** WhatsApp only, contact via email

##### B. Abnormal Pricing
- **Auto:** 1.000 - 500.000 RON (typical: 50.000 RON)
- **Imobiliare:** 10.000 - 10.000.000 RON (typical: 200.000 RON)
- **Electronice:** 100 - 50.000 RON (typical: 2.000 RON)
- **Telefoane:** 100 - 20.000 RON (typical: 1.500 RON)
- Flaguri când prețul < 20% sau > 500% din typical

##### C. Text Analysis
- **Caps ratio:** >40% = suspicioasă
- **Excessive punctuation:** >5% = spam
- **Embedded contact:** Telefon/email în descriere

##### D. Bot Detection
- **Rapid posting:** >10 anunțuri în 60 minute
- **Content similarity:** >90% similaritate între anunțuri

##### E. Duplicate Detection
- MD5 hash pentru title + description
- Detectează repostări identice

#### Scoring System

```typescript
Severity Weights:
- low: 5 points
- medium: 15 points
- high: 30 points
- critical: 50 points

Scam Threshold: score >= 50 → Auto-reject
```

### 3. API Integration

#### POST /api/listings
**Modificat** - Integrare completă cu trust & scam detection

**Flow:**
1. Verifică trust score utilizator
2. Verifică dacă poate publica (`canPerformAction`)
3. Verifică rate limit (listingsPerDay)
4. **RULEAZĂ SCAM DETECTION** înainte de moderare
5. Auto-reject dacă scam confidence >= 0.8
6. Rulează moderare OpenAI
7. Combină flagurile scam + moderation
8. Decide status: approved/pending
9. Salvează scamScore și scamFlags în DB
10. Update trust score dacă success

**Rate Limit Response:**
```json
{
  "error": "Limită zilnică atinsă",
  "message": "Poți publica maxim 10 anunțuri pe zi.",
  "currentTrust": 65,
  "nextLevel": 70
}
```

**Scam Auto-Reject Response:**
```json
{
  "error": "Anunț respins automat",
  "reason": "Conținutul a fost identificat ca potențial fraudulos",
  "flags": [
    "Suspicious keyword detected: western union",
    "Preț suspiciously low compared to market value"
  ],
  "suggestions": [
    "Verifică dacă prețul este realist",
    "Evită cuvinte suspicioase",
    "Nu include date de contact în descriere"
  ]
}
```

#### POST /api/reports
**Nou** - Sistem de raportare

**Body:**
```json
{
  "reporterId": "uuid",
  "reportedUserId": "uuid" | null,
  "reportedListingId": "uuid" | null,
  "category": "scam" | "inappropriate" | "duplicate" | "spam" | "fake_info" | "other",
  "description": "Motivul raportării (min 10 caractere)"
}
```

**Protecții:**
- Necesită trust score >= 50
- Previne rapoarte duplicate (24h cooldown)
- Audit log automat

#### POST /api/reports/[id]/resolve
**Nou** - Rezolvare raport (admin/moderator)

**Actions:**
- `approve` - Raport valid:
  - Deduce 10 puncte trust de la utilizatorul raportat
  - Flagge/ascunde listing-ul
  - Acordă 5 puncte trust raportorului
- `dismiss` - Raport invalid:
  - Nu se iau măsuri

### 4. UI Components

#### TrustBadge Component
**Fișier:** `app/components/TrustBadge.tsx`

```tsx
<TrustBadge 
  trustScore={user.trustScore} 
  showScore={true}
  size="md"
/>
```

**Variante:**
- `size`: "sm" | "md" | "lg"
- `showScore`: afișează scorul numeric
- Iconiță verde (verificat) sau albastră (de încredere)
- Culoare dinamică pe baza scorului

#### ReportButton Component
**Fișier:** `app/components/ReportButton.tsx`

```tsx
<ReportButton
  reporterId={currentUser.id}
  reportedListingId={listing.id}
  size="md"
/>
```

**Features:**
- Modal cu formular de raportare
- 6 categorii predefinite
- Validare: min 10 caractere descriere
- Feedback success/error
- Rate limit handling

### 5. Database Schema

**Modificări Prisma:**

```prisma
model Listing {
  // ... existing fields ...
  
  // NEW: Scam detection fields
  scamScore     Int?     // Total scam detection score
  scamFlags     Json?    // Detected scam flags
}

model User {
  trustScore    Int @default(50)  // Already exists
}
```

**Migrație aplicată:** `20260205170212_add_scam_detection_fields`

### 6. Audit Trail

Toate acțiunile sunt loggate automat în `audit_logs`:

- `trust_score_updated` - Recalculare scor
- `trust_points_awarded` - Puncte acordate
- `trust_points_deducted` - Puncte deduse
- `report_created` - Raport creat
- `report_approve` - Raport aprobat
- `report_dismiss` - Raport respins

## 🚀 Usage Examples

### Check Trust Score și Rate Limit

```typescript
import { getRateLimit, canPerformAction } from "@/lib/trustScore";

const user = await prisma.user.findUnique({ where: { id } });
const limits = getRateLimit(user.trustScore);

if (!canPerformAction(user.trustScore, "publish")) {
  return res.status(403).json({ error: "Trust score too low" });
}
```

### Detectează Scam

```typescript
import { detectScam } from "@/lib/scamDetection";

const scamResult = detectScam({
  title: "Urgent! BMW X5 doar 1000 RON!",
  description: "Contact via WhatsApp only. Western Union accepted.",
  priceAmount: 1000,
  category: "Auto",
  photos: []
});

if (scamResult.isScam && scamResult.confidence >= 0.8) {
  // Auto-reject
}
```

### Update Trust Score

```typescript
import { updateUserTrustScore, awardTrustPoints } from "@/lib/trustScore";

// Recalculare automată
await updateUserTrustScore(userId, "listing_created_successfully");

// Manual adjustment
await awardTrustPoints(userId, 10, "Phone verification completed");
```

### Afișează Trust Badge

```tsx
import TrustBadge from "@/app/components/TrustBadge";

<div className="user-info">
  <h3>{user.name}</h3>
  <TrustBadge trustScore={user.trustScore} showScore={true} />
</div>
```

## 📊 Metrics & Monitoring

### Trust Score Distribution
```sql
SELECT 
  CASE 
    WHEN "trustScore" >= 90 THEN 'VERIFIED'
    WHEN "trustScore" >= 70 THEN 'TRUSTED'
    WHEN "trustScore" >= 50 THEN 'NEUTRAL'
    WHEN "trustScore" >= 30 THEN 'SUSPICIOUS'
    ELSE 'BANNED'
  END as level,
  COUNT(*) as count
FROM users
GROUP BY level;
```

### Scam Detection Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE "scamScore" >= 50) as scam_detected,
  COUNT(*) FILTER (WHERE "scamScore" < 50) as clean,
  AVG("scamScore") as avg_scam_score
FROM listings
WHERE "createdAt" > NOW() - INTERVAL '30 days';
```

### Report Resolution
```sql
SELECT 
  status,
  category,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600) as avg_resolution_hours
FROM reports
GROUP BY status, category;
```

## 🔄 Future Enhancements

### Planned Features
- [ ] Phone verification via SMS (Twilio)
- [ ] Business seller verification (documents)
- [ ] ML-based scam detection (train model)
- [ ] Chat message protection (real-time warnings)
- [ ] Reputation badges (power seller, top rated)
- [ ] Trust score history graph
- [ ] Automated trust recovery program
- [ ] Appeal system for banned users

### Integration Points
- [ ] Email notifications pentru trust changes
- [ ] Admin dashboard cu trust analytics
- [ ] User profile cu trust score visible
- [ ] Seller page cu badges și reviews
- [ ] Search filters by trust level

## 📝 Testing

### Test Scenarios

**1. Rate Limiting:**
```bash
# Create 11 listings rapid pentru un user cu trust 50 (limit: 10)
# Ar trebui să primească 429 Too Many Requests
```

**2. Scam Detection:**
```bash
# Listing cu title: "BMW X5 urgent doar 100 RON Western Union"
# Ar trebui auto-rejected cu scam confidence > 0.8
```

**3. Trust Score Calculation:**
```bash
# Utilizator nou: 50 puncte (neutral)
# După 1 listing completat: 52 puncte
# După phone verification: 67 puncte
# După 30 zile: 68 puncte
```

**4. Report System:**
```bash
# Raportare listing scam → Approve → User pierde 10 puncte
# Raportare duplicată în 24h → 429 error
```

## 🛠️ Maintenance

### Recalculare Batch Trust Scores
```typescript
// scripts/recalculate-trust.ts
const users = await prisma.user.findMany();

for (const user of users) {
  await updateUserTrustScore(user.id, "scheduled_recalculation");
}
```

### Cleanup Old Reports
```sql
DELETE FROM reports 
WHERE status = 'resolved' 
AND "resolvedAt" < NOW() - INTERVAL '90 days';
```

## ⚠️ Important Notes

1. **Trust score nu scade niciodată sub 0** sau peste 100
2. **Email verification este obligatorie** pentru orice trust score > 20
3. **Rate limits se resetează zilnic** la 00:00 (server time)
4. **Scam detection rulează sincron** - nu încetinește API-ul
5. **Audit logs sunt imuabile** - nu se pot șterge/edita

## 🔒 Security Considerations

- Trust score modificări sunt loggate complet
- Report spam este prevenit prin rate limiting
- Scam patterns sunt actualizate regular
- Admin actions necesită autentificare separată
- Sensitive data (rapoarte) nu sunt expuse public

## 📚 Dependencies

- `crypto` - Hash generation pentru duplicate detection
- `@prisma/client` - Database operations
- `lib/audit.ts` - Audit logging
- `lib/observability.ts` - Metrics & logging

---

**Status:** ✅ COMPLETE & PRODUCTION READY
**Last Updated:** 2025-02-05
**Version:** 1.0.0
