# 🚀 Quick Start Guide - Owner Control System

## Deployment în 5 Pași

### 1. Setup Environment
```bash
cp .env.example .env.local
nano .env.local
```

**Necesare**:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="$(openssl rand -base64 32)"
OWNER_EMAIL="admin@yourdomain.com"
OWNER_PASSWORD="StrongPassword123!"
OPENAI_API_KEY="sk-..."
```

### 2. Database Migration
```bash
npx prisma migrate deploy
```

### 3. Initialize OWNER
```bash
npm run init-owner
```

### 4. Build & Start
```bash
npm run build
npm start
# sau cu PM2:
pm2 start ecosystem.config.js
```

### 5. Verify
```bash
# Login ca OWNER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"StrongPassword123!"}'

# Verifică admin access
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔑 Key Features

| Feature | Status | Details |
|---------|--------|---------|
| **JWT Auth** | ✅ | HS256, 7d access, 30d refresh |
| **RBAC** | ✅ | 7 roles, 35 permissions |
| **Audit Log** | ✅ | Immutable, CSV export |
| **Rate Limiting** | ✅ | Memory-based (use Redis in prod) |
| **Bruteforce** | ✅ | 5 fails → 30min lockout |
| **XSS Protection** | ✅ | HTML escaping, input validation |
| **SQL Injection** | ✅ | Keyword detection + Prisma |
| **OpenAI Moderation** | ✅ | Auto-queue if flagged |
| **2FA** | ⏳ | Scaffolded (not implemented) |
| **Admin UI** | ⏳ | APIs ready, UI not built |

---

## 📊 Roles & Permissions

| Role | Permissions | Use Case |
|------|-------------|----------|
| **owner** | ALL (35 perms) | Platform owner, full control |
| **admin** | 30 perms | Daily operations, users, moderation |
| **moderator** | 15 perms | Content moderation, reports |
| **finance** | 8 perms | Payments, refunds, analytics |
| **support** | 10 perms | User support, view data |
| **dealer** | 5 perms | Enhanced user, analytics |
| **user** | 8 perms | Normal user, own listings |

---

## 🔐 Security Presets

| Action | Rate Limit | Protection |
|--------|------------|------------|
| Login | 5 / 15min | Bruteforce (30min lockout) |
| Register | 3 / 1hr | Spam accounts |
| API calls | 100 / 1min | DDoS |
| Create listing | 10 / 1hr | Spam listings |
| Upload image | 20 / 1hr | Storage abuse |
| Moderation | 200 / 1hr | Moderator work |

---

## 🎯 Admin API Endpoints

### Users
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/unban` - Unban user
- `PUT /api/admin/users/:id/role` - Change role

### Moderation Queue
- `GET /api/admin/moderation/queue` - Pending items
- `POST /api/admin/moderation/:id/assign` - Assign to moderator
- `POST /api/admin/moderation/:id/approve` - Approve content
- `POST /api/admin/moderation/:id/reject` - Reject content

### Reports
- `GET /api/admin/reports` - List reports
- `POST /api/admin/reports/:id/resolve` - Resolve report

### Audit Logs
- `GET /api/admin/audit-logs` - View logs
- `GET /api/admin/audit-logs?export=csv` - Export CSV (OWNER/FINANCE)

---

## 🧪 Quick Tests

### Test RBAC
```bash
# Login ca user normal
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test"}' \
  | jq -r '.accessToken')

# Try admin endpoint (trebuie 403)
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Test Rate Limiting
```bash
# 6 login-uri rapide (al 6-lea = 429)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

### Test Audit Log
```bash
# Login, apoi check DB
psql $DATABASE_URL -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;"
```

### Test Moderation
```bash
# Create listing cu spam keyword
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "FREE VIAGRA CLICK HERE",
    "description": "spam",
    "ownerUserId": "...",
    "category": "auto",
    "priceAmount": 1000,
    "condition": "used"
  }'

# Verifică în queue
psql $DATABASE_URL -c "SELECT * FROM moderation_queue WHERE status='pending';"
```

---

## 📁 File Structure

```
lib/
  auth.ts           # JWT, bruteforce, login
  rbac.ts           # 35 permissions, role checks
  audit.ts          # Immutable logging, 20+ helpers
  rateLimit.ts      # Memory-based rate limiter
  sanitize.ts       # XSS/SQL injection protection

app/api/
  auth/
    login/          # JWT login + audit
    register/       # Rate limited register
    refresh/        # Token refresh
    logout/         # Audit log
  admin/
    users/          # List, ban, unban, role
    moderation/     # Queue, assign, approve, reject
    reports/        # List, resolve
    audit-logs/     # View, export CSV

middleware.ts       # Global auth + rate limit

scripts/
  init-owner.ts     # Create OWNER from .env
```

---

## ⚠️ Important Notes

1. **JWT_SECRET**: Must be strong (32+ chars), never commit to git
2. **OWNER Password**: Change immediately after first login
3. **Rate Limiting**: Memory-based, use Redis for production
4. **Audit Logs**: IMMUTABLE - never deleted, GDPR export available
5. **OpenAI Key**: Server-side only, never expose client-side
6. **Database Backup**: Daily backup recommended (`pg_dump`)

---

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| JWT verification failed | Check JWT_SECRET in .env |
| Database connection failed | Verify DATABASE_URL, PostgreSQL running |
| OWNER account not found | Run `npm run init-owner` |
| Rate limit too strict | Adjust presets in lib/rateLimit.ts |
| OpenAI moderation failed | Check OPENAI_API_KEY, rate limits |
| Module '@prisma/client' not found | Run `npx prisma generate` |

---

## 📚 Full Documentation

- **DEPLOYMENT-OWNER-CONTROL.md** - Complete deployment guide
- **ENV-VARIABLES.md** - All environment variables explained
- **IMPLEMENTATION-COMPLETE.md** - Full feature list & statistics

---

✅ **System Ready** - Production-grade owner control cu RBAC, audit logging, și securitate comprehensivă!

🚀 **Deploy Confidence**: High (toate feature-urile core implementate și testate)

📝 **Next**: Build Admin UI React components pentru vizualizare date
