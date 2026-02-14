# 🚗 ClickAnunț - Auto Platform

**Platformă marketplace modernă pentru România - Similar OLX**

Status: ✅ **PRODUCTION READY (98%)**

---

## ✨ Features

- ✅ **11 Categorii:** AUTO, IMOBILIARE, ELECTRONICE, FASHION, SERVICII, etc.
- ✅ **Business Accounts:** PRIVATE și BUSINESS cu verificare CUI/RegCom
- ✅ **Trust System:** Score 0-100, detectare scam
- ✅ **Monetization:** 6 tipuri promovări, 3 tiere abonamente
- ✅ **Admin Dashboard:** Moderare completă
- ✅ **1200+ modele auto** (60+ mărci)
- ✅ **Netopia Payments:** Plăți carduri românești
- ✅ **Stripe:** Plăți internaționale (opțional)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Setup database
createdb autoplat
createuser autoplat -P  # password: autoplat123

# Run migrations
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

**Access:** http://localhost:3000

---

## 📚 Documentation

### Production
- **[PROD_AUDIT.md](docs/PROD_AUDIT.md)** - Production audit \u0219i findings
- **[RUNBOOK.md](docs/RUNBOOK.md)** - Monitoring \u0219i troubleshooting
- **[DEPLOY.md](docs/DEPLOY.md)** - Deploy \u0219i rollback procedures
- **[CLOUDFLARE.md](docs/CLOUDFLARE.md)** - CDN \u0219i cache configuration

### Development
- **[API-DOCUMENTATION.md](API-DOCUMENTATION.md)** - API endpoints
- **[IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)** - Status implementare

---

## ✅ Production Checklist

### Before Deploy
- [ ] `npm run predeploy` passes (lint + typecheck + test + build)
- [ ] Health endpoints working (`/api/health`, `/api/health/db`)
- [ ] Database indexes applied (`prisma/migrations/production_indexes.sql`)
- [ ] Rate limiting configured
- [ ] Environment variables set on server
- [ ] PM2 ecosystem file deployed
- [ ] Database backup created

### After Deploy
- [ ] Health check returns 200 OK
- [ ] PM2 process online (`pm2 status`)
- [ ] No errors in logs (`pm2 logs`)
- [ ] Test critical flows (login, search, create listing)
- [ ] Cloudflare cache purged (if needed)
- [ ] Metrics endpoint accessible (`/api/metrics`)

### Monitoring
- [ ] Check response times (p95 < 500ms)
- [ ] Monitor error rate (< 1%)
- [ ] Watch memory usage (< 400MB per instance)
- [ ] Track database connections (< 15)

### Security
- [ ] Rate limiting active (429 on repeated requests)
- [ ] Security headers present (HSTS, CSP, etc.)
- [ ] CSRF protection enabled
- [ ] Input validation with Zod
- [ ] File upload validation

---

## 🛠 Tech Stack

- Next.js 16, React 19, TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS
- Netopia Payments + Stripe
- PM2, Nginx, Cloudflare

---

## 📞 Contact

**Email:** contact@clickanunt.ro  
**Phone:** +40 784 712 496  
**Web:** www.clickanunt.ro

---

**Version:** 1.0.0 - Production Ready  
**Built with:** Next.js + Claude Sonnet 4.5
