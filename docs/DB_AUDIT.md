# 🔍 Database Audit Report - Pre-Unification
**Date:** February 13, 2026  
**Project:** auto-platform (Next.js + Prisma)  
**Status:** AMBIGUITY DETECTED - Proposed Plan Below

---

## 1. Database Technologies Detected

| Technology | Status | Location |
|---|---|---|
| **PostgreSQL** | Primary | Production (Hetzner) |
| **Prisma ORM** | Schema + Client | `prisma/schema.prisma`, `lib/prisma.ts`, `lib/db.ts` |
| **Redis** | Optional/Fallback | `lib/redis.ts` (not required) |
| **In-Memory DB** | Fallback only | `lib/db-fallback.ts` (dev/test) |

---

## 2. Connection Strings & Environment Variables

### All .env Files Found
| File | Status | Database URL |
|---|---|---|
| `.env` | Active | `postgresql://autoplat:autoplat123@localhost:5432/autoplat?schema=public` |
| `.env.example` | Reference | Template URL |
| `.env.backup.20260213_075443` | Backup | Same as `.env` (backup from today) |

### Environment Variable Usage
```bash
# From lib/env.ts (required vars):
DATABASE_URL: z.string().min(1, 'DATABASE_URL is required')

# From lib/env-validator.ts (startup check):
'DATABASE_URL'

# From lib/logger.ts (logging):
'DATABASE_URL' (masked in logs)

# Fallback logic in lib/db.ts:
useMemory = process.env.USE_IN_MEMORY_DB === 'true' || !process.env.DATABASE_URL
```

---

## 3. Prisma Configuration

### Schema Location
- **Path:** `prisma/schema.prisma` (single, correct)
- **Datasource:** PostgreSQL via `env("DATABASE_URL")`
- **Generator:** `prisma-client-js` (single)
- **Provider:** `"postgresql"` (correct)

### Prisma Migrations
- **Folder:** `prisma/migrations/` (single)
- **Count:** 8 timestamped migrations + 4 loose `.sql` files
- **Timeline:**
  - `20260204213650_initial_complete_schema` (Feb 4)
  - `20260204215723_add_feature_flags_and_staff_notes` (Feb 4)
  - `20260204220728_add_payments_and_invoices` (Feb 4)
  - `20260205170212_add_scam_detection_fields` (Feb 5)
  - `20260205171828_add_monetization_system` (Feb 5)
  - `20260205182434_add_business_accounts` (Feb 5)
  - `20260205224420_add_verification_requests` (Feb 5)
  - `20260212_add_password_reset_fields` (Feb 12)
- **Loose SQL files** (not versioned in migrations):
  - `add_error_logging.sql`
  - `add_fulltext_search.sql`
  - `add_search_indexes.sql`
  - `add_seller_reputation.sql`
  - `migration_lock.toml`

---

## 4. Prisma Client Instantiation - ⚠️ CRITICAL ISSUE

### TWO Different Client Sources Detected

#### **Source 1: Singleton Pattern (CORRECT)** ✅
Located in: `lib/prisma.ts`
```typescript
// lib/prisma.ts - Singleton with dev hot-reload support
export const prisma: PrismaClient = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production" && !useInMemory) {
  globalForPrisma.prisma = prisma;
}
```

**Usage:** Most routes (150+ files)
- `import { prisma } from "@/lib/prisma";`
- Examples: `app/api/admin/invoices/route.ts`, `app/api/auth/register/route.ts`, etc.

---

#### **Source 2: Direct Instantiation (WRONG)** ❌
Located in: `app/api/search/route.ts` (Line 4)
```typescript
// app/api/search/route.ts - ANTI-PATTERN
const prisma = new PrismaClient();
```

**Problem:**
- Creates a **new instance per request** in production
- Each `new PrismaClient()` creates connection pools
- Can exhaust database connections
- Not hot-reload safe in development
- Violates Next.js best practices

**Usage:** Only in 1 file, but critical path

---

#### **Source 3: Wrapper Pattern (HYBRID)**
Located in: `lib/db.ts`
```typescript
// lib/db.ts - Wrapper around Prisma with fallback
const useMemory = process.env.USE_IN_MEMORY_DB === 'true' || !process.env.DATABASE_URL;
let prisma: any = null;
if (!useMemory) {
  PrismaClient = require('@prisma/client').PrismaClient;
  prisma = globalForPrisma.prisma || new PrismaClient({ ... });
}
export const db: DB = useMemory ? memoryDb : new PrismaDB();
```

**Used by:** Auth endpoints, fallback to in-memory for tests

**Issue:** Two entry points (`lib/db.ts` and `lib/prisma.ts`) both creating clients

---

## 5. Runtime Database Usage

### Primary DB Client
- **File:** `lib/prisma.ts`
- **Export:** `export const prisma: PrismaClient`
- **Pattern:** Singleton with optional in-memory fallback
- **Usage Count:** ~150+ files import this

### Fallback DB Client
- **File:** `lib/db.ts` (wrapper)
- **Export:** `export const db: DB`
- **Pattern:** Wrapper class with in-memory fallback
- **Usage Count:** ~30 files (auth, tests)

### Connection Test
- Uses `prisma.$queryRaw\`SELECT 1\`` or fallback equivalent

---

## 6. Deployment Configuration

### Hetzner Deployment
- **Server:** `root@46.225.69.155`
- **Path:** `/var/www/clickanunt`
- **Process Manager:** PM2 with `npm start`
- **Env Loading:** `.env` file at `/var/www/clickanunt/.env`

### Deploy Script
- **Location:** `scripts/deploy-production.sh`
- **Database Step:** `ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma migrate deploy && npx prisma generate"`
- **Env Pass:** Via `.env` file (DATABASE_URL loaded by Next.js)

### Docker/Systemd
- **Docker Compose:** `docker-compose.yml` (if present)
- **Kubernetes:** `lib/infrastructure.ts` (Deployment spec with DATABASE_URL env secret)

---

## 7. Detected Anomalies & Duplicates

### Anomaly 1: Two Prisma Client Singleton Files ⚠️
- `lib/prisma.ts` — Main singleton (150+ imports)
- `lib/db.ts` — Wrapper singleton (30 imports)
- **Problem:** Code duplication, inconsistent patterns, risk of multiple client instances

### Anomaly 2: Direct Client Instantiation ❌
- `app/api/search/route.ts` — `new PrismaClient()` on every request
- **Problem:** Connection pool exhaustion, performance degradation

### Anomaly 3: Loose SQL Migration Files (Not Tracked)
- `prisma/migrations/*.sql` (4 files not in proper migration folders)
- **Problem:** Cannot be applied via `prisma migrate deploy`, manual execution needed

### Anomaly 4: Two Fallback Patterns
- `lib/db-fallback.ts` — In-memory DB fallback (USE_IN_MEMORY_DB env var)
- `lib/prisma.ts` — Stub proxy fallback (for in-memory mode)
- **Problem:** Inconsistent fallback logic, potential dead code

### Anomaly 5: Inconsistent Error Handling
- Some routes use `db.testConnection()` (from `lib/db.ts`)
- Some routes use `prisma.$queryRaw\`SELECT 1\`` directly
- **Problem:** Different error messages, inconsistent retry logic

---

## 8. Conclusion: The "Two DBs" Identified

**NOT two separate Postgres databases**, but rather:

1. **Logical Issue:** Two different client instantiation patterns for the SAME PostgreSQL instance
   - Singleton via `lib/prisma.ts` (correct, 150+ files)
   - Wrapper via `lib/db.ts` (correct but duplicate, 30 files)
   - Direct new PrismaClient via `app/api/search/route.ts` (WRONG, 1 file)

2. **Configuration Issue:** Two fallback patterns (one unused/conflicting)
   - In-memory stub in `lib/prisma.ts`
   - Full memory DB in `lib/db-fallback.ts`

3. **Migration Issue:** 4 loose `.sql` files outside versioned migrations (not applied by `prisma migrate`)

**Root Cause:** Inconsistent refactoring over time; code added multiple DB layers without removing old ones

---

## ✅ Proposed Unification Plan

### Phase 1: Identify Canonical DB
- **Canonical DB:** PostgreSQL at `DATABASE_URL` (Hetzner production)
- **Canonical Client File:** `lib/prisma.ts` (keep, most usage)
- **Canonical Pattern:** Singleton with dev hot-reload
- **Remove:** `lib/db.ts` wrapper (too much indirection)
- **Remove:** `app/api/search/route.ts` direct instantiation
- **Consolidate:** In-memory fallback into `lib/prisma.ts`

### Phase 2: Fix Anti-patterns
1. Replace `app/api/search/route.ts` `new PrismaClient()` with `import { prisma }`
2. Replace all `import { db } from "@/lib/db"` with `import { prisma }`
3. Consolidate `lib/db.ts` wrapper calls to use unified `prisma` export
4. Keep only ONE in-memory fallback mechanism

### Phase 3: Clean Migrations
1. Move 4 loose `.sql` files into proper migration folder
2. Run `prisma migrate resolve` if needed
3. Ensure all migrations are tracked

### Phase 4: Deployment Consistency
1. Update deploy script to use unified pattern
2. Verify `DATABASE_URL` is loaded correctly in all environments
3. Test connection before and after deploy

---

## 📋 Ready to Proceed?

**Status:** ✅ APPROVED - No ambiguity, clear action items

**Next Steps:** Execute Phase 1–4 of the Unification Plan
