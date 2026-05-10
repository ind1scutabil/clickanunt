# 🔍 Complete Database Audit Report - All Sources Identified
**Date:** February 13, 2026  
**Status:** COMPREHENSIVE ANALYSIS COMPLETE - All connection sources found  
**Methodology:** Grep + file analysis - NO GUESSING

---

## EXECUTIVE FINDINGS

### Database Connection Sources Found: 7 DISTINCT PATTERNS

#### ✅ **CANONICAL DATABASE LAYERS** (Single Source)
1. **lib/prisma.ts** — MAIN SINGLETON (imports: 30+ routes)
2. **lib/db.ts** — WRAPPER AROUND PRISMA (imports: 8+ routes/scripts)

#### ❌ **ANTI-PATTERN DATABASE INSTANTIATIONS** (Direct new PrismaClient)
3. **lib/2fa.ts** — `const prisma = new PrismaClient()` (library module)
4. **scripts/create-admin.ts** — `const prisma = new PrismaClient()`
5. **scripts/test-password.ts** — `const prisma = new PrismaClient()`
6. **scripts/init-owner.ts** — `const prisma = new PrismaClient()`
7. **scripts/test-invoice-flow.js** — `const prisma = new PrismaClient()`
8. **scripts/delete-non-admin-users.js** — `const prisma = new PrismaClient()`
9. **prisma/seed-listings.ts** — `const prisma = new PrismaClient()`

#### ⚠️ **ADAPTER-BASED INSTANTIATION** (Fallback pattern)
10. **prisma/seed.cjs** — Uses `@prisma/adapter-pg` (special Postgres adapter)

#### ℹ️ **FALLBACK/TESTING LAYER**
11. **lib/db-fallback.ts** — In-memory DB for testing (ONLY when `USE_IN_MEMORY_DB=true` or no DATABASE_URL)

#### 📚 **DOCUMENTATION ONLY** (not actual code)
12. **lib/db-optimization.ts** — SQL recommendations, NOT a database client

---

## DETAILED INVENTORY

### PART 1: CANONICAL SOURCES (✅ KEEP)

#### 1️⃣ **lib/prisma.ts** — PRIMARY SINGLETON
**Status:** ✅ CORRECT - Production singleton  
**Pattern:** Singleton with globalThis hook (dev hot-reload safe)  
**Imports:** 30+ files  
**Configuration:**
```typescript
export const prisma: PrismaClient = useInMemory 
  ? createStubPrisma()
  : (globalForPrisma.prisma ?? new PrismaClient({...}));
```
**Files using it (30+):**
- app/api/payments/route.ts
- app/api/reports/route.ts
- app/api/payments/netopia/route.ts
- app/api/users/me/route.ts
- app/api/users/[id]/profile/route.ts
- app/api/payments/webhook/route.ts
- app/api/users/me/verify-business/route.ts
- app/api/users/[id]/route.ts
- app/api/reports/[id]/resolve/route.ts
- app/api/subscriptions/route.ts
- app/api/listings/draft/route.ts
- app/api/listings/[id]/route.ts
- app/api/listings/[id]/promote/route.ts
- app/api/admin/reports/route.ts
- app/api/health/route.ts
- app/api/listings/route.ts (also imports db)
- app/api/admin/bulk-actions/route.ts
- app/api/admin/users/route.ts
- app/api/admin/reports/[id]/resolve/route.ts
- app/api/admin/users/[id]/ban/route.ts
- app/api/admin/users/[id]/unban/route.ts
- app/api/admin/users/[id]/role/route.ts
- app/api/invoices/[id]/route.ts
- app/api/auth/change-password/route.ts
- app/api/admin/moderation/queue/route.ts
- app/api/admin/moderation/[id]/reject/route.ts
- app/api/admin/moderation/[id]/approve/route.ts
- app/api/admin/moderation/[id]/assign/route.ts
- (canonical sitemap: `app/sitemap.ts` + `app/sitemap-serve/*`; legacy `app/sitemap.xml/route.ts` eliminat pentru a evita duplicarea și URL-uri greșite)
- lib/audit.ts
- lib/health.ts
- lib/trustScore.ts
- lib/invoice.ts
- lib/featureFlags.ts
- prisma/seed.ts
- scripts/check-tables.ts

---

#### 2️⃣ **lib/db.ts** — WRAPPER LAYER
**Status:** ✅ CORRECT - Uses canonical prisma.ts  
**Pattern:** Class wrapper with helper methods  
**Imports:** 8 files  
**Key Code:**
```typescript
import { prisma } from './prisma';  // ← Routes to canonical!
class PrismaDB {
  async findUserByEmail(email: string) {
    return await prisma!.user.findUnique({ where: { email } });
  }
  // ... other helper methods ...
}
export const db: DB = useMemory ? memoryDb : new PrismaDB();
```
**Files using it (8):**
- lib/auth.ts
- lib/2fa.ts.bak (backup)
- app/api/users/route.ts
- app/api/listings/route.ts
- app/api/auth/login/route.ts
- app/api/auth/register/route.ts
- tests/auth.test.ts
- scripts/reset-login.ts
- scripts/create-user.ts
- scripts/test-login.ts

---

### PART 2: ANTI-PATTERNS (❌ MUST FIX)

#### ❌ **lib/2fa.ts** — Direct instantiation
**Current:**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```
**Problem:** Creates new client instance, not singleton  
**Impact:** Medium (library module, not per-request, but still connection pool risk)  
**Frequency:** Module loaded once per app lifecycle  
**Fix:** Import from lib/prisma  

---

#### ❌ **scripts/create-admin.ts** — Direct instantiation
**Current:**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```
**Problem:** One-time script, acceptable but inconsistent  
**Impact:** Low (script runs once during setup)  
**Frequency:** Manual execution only  
**Fix:** Import from lib/prisma  

---

#### ❌ **scripts/test-password.ts** — Direct instantiation
**Current:**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```
**Problem:** Testing script  
**Impact:** Low (dev/manual only)  
**Frequency:** Manual execution only  
**Fix:** Import from lib/prisma  

---

#### ❌ **scripts/init-owner.ts** — Direct instantiation
**Current:**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```
**Problem:** Setup script  
**Impact:** Low (one-time execution)  
**Frequency:** Manual execution only  
**Fix:** Import from lib/prisma  

---

#### ❌ **scripts/test-invoice-flow.js** — Direct instantiation
**Current:**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```
**Problem:** Test/validation script  
**Impact:** Low (dev/manual only)  
**Frequency:** Manual execution only  
**Fix:** Convert to import from lib/prisma or use db wrapper  

---

#### ❌ **scripts/delete-non-admin-users.js** — Direct instantiation
**Current:**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```
**Problem:** Destructive script  
**Impact:** Low (manual execution only, but dangerous)  
**Frequency:** Manual execution only  
**Fix:** Import from lib/prisma  

---

#### ❌ **prisma/seed-listings.ts** — Direct instantiation
**Current:**
```typescript
import { PrismaClient, Condition, FuelType, Transmission } from '@prisma/client';
const prisma = new PrismaClient();
```
**Problem:** Seeding script  
**Impact:** Low (runs once during setup)  
**Frequency:** Manual execution only  
**Fix:** Import from lib/prisma  

---

### PART 3: SPECIAL ADAPTERS (⚠️ INVESTIGATE)

#### ⚠️ **prisma/seed.cjs** — Adapter pattern
**Current:**
```javascript
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});
```
**Analysis:**
- Uses special `@prisma/adapter-pg` (Postgres adapter)
- Still creates new instance (not singleton)
- Explicit connection string configuration
- Unclear why this differs from standard pattern

**Decision:**
- ⚠️ INVESTIGATE: Why does this use adapter pattern?
- Does adapter bring additional benefits?
- Should other scripts use same pattern?
- **Recommendation:** Consolidate to standard lib/prisma pattern or document why different

---

### PART 4: SUPPORTING LAYERS (ℹ️ CONTEXT)

#### ℹ️ **lib/db-fallback.ts** — In-Memory Database
**Status:** ℹ️ FUNCTIONAL - For testing only  
**When Used:** When `USE_IN_MEMORY_DB=true` or `DATABASE_URL` not set  
**Usage:** Fallback in lib/db.ts and lib/prisma.ts  
**Pattern:** Complete in-memory implementation of DB interface  
**No Changes Needed**

---

#### 📚 **lib/db-optimization.ts** — Documentation
**Status:** 📚 DOCUMENTATION ONLY  
**Content:** SQL optimization recommendations  
**Usage:** Never imported or executed  
**No Changes Needed**

---

### PART 5: SINGLE SOURCE VERIFICATION

#### ✅ **Prisma Schema**
**File:** prisma/schema.prisma  
**Datasource:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
**Status:** ✅ SINGLE - One datasource, one database  

---

#### ✅ **Environment Variables**
**All .env files:** Single DATABASE_URL pointing to same PostgreSQL instance  
- `.env` — `postgresql://autoplat:autoplat123@localhost:5432/autoplat?schema=public`
- `.env.example` — Template
- `.env.backup.*` — Backups of same config

**Status:** ✅ SINGLE - One database connection string  

---

#### ✅ **Migrations**
**Location:** prisma/migrations/  
**Total:** 12 migrations, all for same PostgreSQL database  
**Status:** ✅ SINGLE - One migration history  

---

## SUMMARY TABLE

| File | Type | Status | Count | Action |
|------|------|--------|-------|--------|
| lib/prisma.ts | Canonical | ✅ KEEP | 30+ imports | Core singleton |
| lib/db.ts | Wrapper | ✅ KEEP | 8 imports | Backward compat |
| lib/2fa.ts | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| scripts/create-admin.ts | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| scripts/test-password.ts | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| scripts/init-owner.ts | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| scripts/test-invoice-flow.js | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| scripts/delete-non-admin-users.js | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| prisma/seed-listings.ts | Anti-pattern | ❌ FIX | 1 file | Switch to lib/prisma |
| prisma/seed.cjs | Special | ⚠️ INVESTIGATE | 1 file | Verify adapter necessity |
| lib/db-fallback.ts | Support | ✅ KEEP | - | Testing fallback |
| lib/db-optimization.ts | Docs | ✅ KEEP | - | Reference only |

---

## CONCLUSION

✅ **ONE DATABASE IDENTIFIED:** PostgreSQL at `DATABASE_URL`  
✅ **ONE SCHEMA:** prisma/schema.prisma (single datasource)  
✅ **TWO CORRECT LAYERS:** lib/prisma.ts (canonical) + lib/db.ts (wrapper)  
❌ **NINE ANTI-PATTERNS:** Direct `new PrismaClient()` instantiations  

**Total Database Connection Sources:** 
- Canonical: 2
- Anti-patterns: 9
- Adapters: 1
- Support: 2

**Files to fix:** 9 (1 lib + 6 scripts + 1 seed + 1 adapter investigation)

**No data loss required** — All fixes are code-only refactoring.
