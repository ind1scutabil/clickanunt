# 🚀 DEPLOYMENT GUIDE - Auto Platform cu RBAC & Audit

## 📋 Checklist Pre-Deployment

### 1. Environment Variables (.env.local sau .env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/auto_platform"

# JWT Secret (generează unul unic cu: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# OWNER Account (contul principal cu acces complet)
OWNER_EMAIL="owner@yourdomain.com"
OWNER_PASSWORD="SecurePassword123!"

# OpenAI pentru moderare automată
OPENAI_API_KEY="sk-..."

# S3 Storage (dacă folosești cloud storage)
S3_ENDPOINT="https://..."
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="auto-platform-uploads"
S3_REGION="eu-west-1"

# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="alt-secret-pentru-nextauth"

# Optional: Rate Limiting cu Redis (recomandat pentru producție)
REDIS_URL="redis://localhost:6379"
```

### 2. Database Setup

```bash
# 1. Creează database PostgreSQL
createdb auto_platform

# 2. Rulează migrările Prisma
npx prisma migrate deploy

# 3. (Optional) Verifică schema
npx prisma studio
```

### 3. OWNER Account Initialization

```bash
# Creează contul OWNER din .env
npm run init-owner
# sau
tsx scripts/init-owner.ts
```

**IMPORTANT**: Rulează acest script DOAR o singură dată la primul deployment.

### 4. Build & Start

```bash
# Development
npm run dev

# Production Build
npm run build

# Production Start
npm start

# Cu PM2 (recomandat)
pm2 start ecosystem.config.js
pm2 save
```

## 🔐 Securitate - Checklist

### Rate Limiting
- ✅ Login: 5 încercări / 15 minute
- ✅ Register: 3 conturi / oră per IP
- ✅ API: 100 request / minut per IP
- ✅ Upload imagini: 20 / oră per user
- ✅ Creare listing: 10 / oră per user

### Bruteforce Protection
- ✅ 5 failed login → cont blocat 30 minute
- ✅ IP tracking pentru audit
- ✅ Password requirements: min 8 chars, 1 letter, 1 number

### XSS & SQL Injection Protection
- ✅ HTML escaping în lib/sanitize.ts
- ✅ SQL injection detection (SELECT, DROP, --, etc.)
- ✅ Prisma folosește prepared statements

### RBAC (Role-Based Access Control)
- ✅ 7 roles: user, dealer, support, moderator, finance, admin, owner
- ✅ 35 permisiuni granulare
- ✅ Hierarchie: owner > admin > moderator/finance > support > dealer > user
- ✅ Middleware verifică JWT pe toate rutele protejate

### Audit Logging
- ✅ Toate acțiunile importante sunt logate
- ✅ IMMUTABLE logs (nu pot fi șterse)
- ✅ Export CSV pentru OWNER și FINANCE (GDPR compliance)
- ✅ Tracking: who, what, when, before/after state

## 📊 Admin Dashboard

### Acces
URL: `https://yourdomain.com/admin`

Necesită: JWT token cu role ≥ moderator

### Features Disponibile

#### 1. Users Management (`/admin/users`)
- Listare utilizatori cu filtre (role, banned, trust score)
- Ban/Unban cu motiv
- Schimbare role (doar OWNER poate seta role OWNER)
- Vizualizare failedLoginAttempts, lastLoginAt, listing count

API Endpoints:
```
GET    /api/admin/users              (filtre: role, isBanned, limit, offset)
POST   /api/admin/users/:id/ban      (body: {reason})
POST   /api/admin/users/:id/unban
PUT    /api/admin/users/:id/role     (body: {role})
```

#### 2. Moderation Queue (`/admin/moderation`)
- Queue cu pending listings (automat populate de OpenAI moderation)
- Sortare by priority (score < 0.3 = priority 1)
- Assign către moderatori
- Approve/Reject cu motiv

API Endpoints:
```
GET    /api/admin/moderation/queue   (filtre: status, entityType, assignedTo)
POST   /api/admin/moderation/:id/assign    (body: {moderatorId})
POST   /api/admin/moderation/:id/approve
POST   /api/admin/moderation/:id/reject    (body: {reason})
```

#### 3. Reports (`/admin/reports`)
- Rapoarte de la utilizatori
- Status: pending, investigating, resolved, dismissed
- Resolve cu resolution text

API Endpoints:
```
GET    /api/admin/reports            (filtre: status, entityType)
POST   /api/admin/reports/:id/resolve (body: {resolution, status})
```

#### 4. Audit Logs (`/admin/audit-logs`)
- Vizualizare toate acțiunile platformei
- Filtre: userId, action, entityType, date range
- Export CSV (doar OWNER și FINANCE)

API Endpoints:
```
GET    /api/admin/audit-logs         (filtre: userId, action, entityType, from, to)
GET    /api/admin/audit-logs?export=csv
```

## 🧪 Testing După Deployment

### 1. Test RBAC
```bash
# Login ca user normal
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test123"}'

# Încearcă să accesezi admin endpoint (trebuie să dea 403)
curl -X GET https://yourdomain.com/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN"
```

### 2. Test Rate Limiting
```bash
# Încearcă 6 login-uri rapid (al 6-lea trebuie să dea 429)
for i in {1..6}; do
  curl -X POST https://yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### 3. Test Bruteforce Protection
```bash
# 5 wrong passwords → cont blocat 30 minute
# Al 6-lea request trebuie să returneze 423 Locked
```

### 4. Test Audit Log
```bash
# Creează un user, apoi verifică în DB:
SELECT * FROM audit_logs WHERE action = 'user:created' ORDER BY timestamp DESC LIMIT 1;
```

### 5. Test Moderation Flow
```bash
# Creează listing cu keyword spam → trebuie să intre în moderation queue
curl -X POST https://yourdomain.com/api/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"FREE VIAGRA CLICK HERE","description":"spam","ownerUserId":"...",...}'

# Verifică în DB:
SELECT * FROM moderation_queue WHERE status = 'pending';
```

## 🔄 Maintenance

### Backup Database (recomandat zilnic)
```bash
pg_dump auto_platform > backup_$(date +%Y%m%d).sql
```

### View Audit Logs
```bash
# Ultimele 100 acțiuni
npx prisma studio
# Deschide tabelul audit_logs
```

### Clear Rate Limit pentru un IP (debugging)
```javascript
// În lib/rateLimit.ts există funcția resetRateLimit(identifier)
// Poate fi expusă ca admin endpoint dacă e nevoie
```

## 📞 Support & Troubleshooting

### JWT Token Invalid
- Verifică JWT_SECRET în .env
- Token expiră după 7 zile (access) / 30 zile (refresh)
- Folosește /api/auth/refresh pentru refresh

### Database Connection Failed
- Verifică DATABASE_URL în .env
- Asigură-te că PostgreSQL rulează
- Check firewall rules

### OpenAI Moderation Failed
- Verifică OPENAI_API_KEY
- Check rate limits OpenAI (tier-based)
- Fallback: moderationStatus = 'pending' (manual review)

### Rate Limit Issues în Producție
- Implementează Redis pentru distributed rate limiting
- Înlocuiește memory store din lib/rateLimit.ts
- Documentație: https://github.com/express-rate-limit/express-rate-limit

## 🎯 Next Steps

1. **Implementează Admin UI** - React components pentru dashboard
2. **Add 2FA** - Folosește speakeasy (deja instalat)
3. **Email Notifications** - Ban notifications, appeal responses
4. **Redis Rate Limiting** - Pentru scalare multi-server
5. **Automated Tests** - Jest/Playwright pentru RBAC și moderation
6. **GDPR Compliance** - Data export, right to be forgotten endpoints
7. **Monitoring** - Sentry pentru errors, Grafana pentru metrics

---

✅ **Deployment Complete** - Platformă cu owner control complet, RBAC, audit logging, și moderation workflow!
