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

- **[PRODUCTION-DEPLOY.md](deploy/PRODUCTION-DEPLOY.md)** - Ghid deploy complet
- **[CLOUDFLARE-SETUP.md](deploy/CLOUDFLARE-SETUP.md)** - Setup Cloudflare
- **[API-DOCUMENTATION.md](API-DOCUMENTATION.md)** - API endpoints
- **[IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)** - Status implementare

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
