# Magic Link Implementation - Current Status & Next Steps

**Date:** 2026-02-12  
**Current Progress:** ~15% Complete  
**Token Usage:** High - Comprehensive plan needed for completion

---

## ✅ COMPLETED (Step 0-1 Partial)

### Step 0: Discovery ✅
- Created comprehensive plan: `docs/auth/MAGIC_LINK_PLAN.md`
- Analyzed current stack (Next.js 16, Prisma, Nodemailer, Redis)
- Identified all Turnstile usage points

### Step 1: Turnstile Removal (Partial) ✅
**Backend Complete:**
- ✅ Deleted `lib/bot-protection.ts`
- ✅ Deleted `app/components/TurnstileWidget.tsx`
- ✅ Removed Turnstile from `lib/security/middleware.ts`
- ✅ Removed `turnstileToken` from all validation schemas
- ✅ Updated `app/api/auth/login/route.ts`
- ✅ Updated `app/api/auth/register/route.ts`
- ✅ Updated `app/api/auth/register-extended/route.ts`
- ✅ Created removal documentation: `docs/auth/TURNSTILE_REMOVAL.md`

**Frontend/Infrastructure Remaining:**
- ⏳ UI components still have Turnstile imports (5 files)
- ⏳ Infrastructure config needs update
- ⏳ Build test not run yet

---

## 🚧 CRITICAL REMAINING WORK

### Immediate (Must Do)

#### 1. Complete Turnstile Removal (30 min)
```bash
# Run the cleanup script (partial automation)
./scripts/remove-turnstile-ui.sh

# Then manually edit these files to remove:
# - <TurnstileWidget /> JSX components
# - turnstileToken from fetch() bodies
# - Validation logic checking turnstileToken

app/components/LoginForm.tsx
app/components/SignupFormExtended.tsx  
app/components/CreateListingFlow.tsx
app/components/OptimizedListingFlow.tsx
app/components/ReportButton.tsx
```

#### 2. Test Build (5 min)
```bash
npm ci
npm run verify  # lint + type-check + test
npm run build
```

Fix any errors that appear.

### Step 2: Database Schema (1 hour)

Create Prisma migration with these models:

```prisma
// Add to prisma/schema.prisma

enum MagicLinkPurpose {
  SIGNIN
  VERIFY
  RESET
  ADMIN
}

enum AuthAuditEvent {
  MAGIC_REQUEST
  MAGIC_SENT
  MAGIC_CONSUME_SUCCESS
  MAGIC_CONSUME_FAIL
  RATE_LIMITED
  INVALID_TOKEN
  EXPIRED_TOKEN
  USED_TOKEN
  ADMIN_STEP_UP_REQUIRED
  ADMIN_STEP_UP_SUCCESS
}

model MagicLinkToken {
  id          String            @id @default(uuid())
  email       String
  purpose     MagicLinkPurpose
  tokenHash   String            @unique
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime          @default(now())
  ip          String?
  userAgent   String?
  userId      String?
  meta        Json?
  
  user        User?             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([email, purpose])
  @@index([expiresAt])
  @@map("magic_link_tokens")
}

model AuthAuditLog {
  id          String          @id @default(uuid())
  event       AuthAuditEvent
  emailMasked String
  ip          String?
  userAgent   String?
  createdAt   DateTime        @default(now())
  detail      Json?
  
  @@index([createdAt])
  @@index([event])
  @@map("auth_audit_logs")
}

model RateLimitBucket {
  id        String   @id @default(uuid())
  key       String   @unique
  count     Int      @default(0)
  resetAt   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([resetAt])
  @@map("rate_limit_buckets")
}

// Modify User model:
model User {
  // ... existing fields ...
  password  String?  // Make optional for magic link users
  
  // Add relation
  magicLinkTokens MagicLinkToken[]
}
```

Then run:
```bash
npx prisma migrate dev --name add_magic_link_auth
npx prisma generate
```

### Step 3-4: Core Magic Link Logic (2-3 hours)

Create these files with full implementation:

**1. `lib/auth/magic-link.ts`** (400 lines)
- `generateMagicLinkToken()` - Crypto random + SHA256
- `sendMagicLink()` - Email sending with template
- `consumeMagicLinkToken()` - Validation + session creation
- Purpose-specific logic for SIGNIN/VERIFY/RESET/ADMIN

**2. `lib/auth/rate-limit.ts`** (200 lines)
- Email rate limiting (1/60s, 10/24h)
- IP rate limiting (30/24h)
- Redis or DB-backed implementation

**3. `lib/auth/admin-step-up.ts`** (100 lines)
- Admin email list from env
- Session step-up tracking
- Middleware for admin routes

**4. `lib/auth/audit-log.ts`** (100 lines)
- Event logging with masked emails
- Prisma integration

### Step 5: API Endpoints (2 hours)

**1. `app/api/auth/magic-link/request/route.ts`**
```typescript
POST /api/auth/magic-link/request
Body: { email, purpose }
- Rate limit check
- Create token
- Send email
- Always return 200
```

**2. `app/api/auth/magic-link/consume/route.ts`**
```typescript
GET /api/auth/magic-link/consume?token=...&purpose=...
- Validate token
- Mark as used
- Create session
- Redirect
```

**3. `app/api/auth/magic-link/test-retrieve/route.ts`** (TEST ONLY)
```typescript
GET /api/auth/magic-link/test-retrieve?email=...
- Guarded by NODE_ENV=test
- Returns last sent link for E2E tests
```

### Step 6: UI Pages (2 hours)

**1. `app/auth/signin/page.tsx`**
- Email input form
- Magic link request
- "Use password instead" link (fallback)

**2. `app/auth/check-email/page.tsx`**
- "Check your inbox" message
- Resend button with cooldown
- Spam folder reminder

**3. `app/auth/magic/page.tsx`**
- Auto-consume token from URL
- Loading/error/success states

**4. `app/admin/verify/page.tsx`**
- Admin step-up form

### Step 7: Email Templates (1 hour)

**`lib/email/templates/magic-link.ts`**
- HTML template with button
- Purpose-specific subjects
- ClickAnunt branding

### Step 8: Tests (2 hours)

**Unit Tests (Jest):**
- Token generation/validation
- Rate limiting
- API endpoints

**E2E Tests (Playwright):**
- Magic link flow
- Admin step-up

### Step 9-11: Final (2 hours)

- Remove remaining clutter
- Run full test suite
- Fix all failures
- Deploy script test
- Production deployment

---

## ESTIMATED TIME TO COMPLETION

- **Turnstile cleanup:** 30 minutes
- **Database schema:** 1 hour
- **Core logic:** 3 hours
- **API endpoints:** 2 hours
- **UI pages:** 2 hours
- **Email templates:** 1 hour
- **Tests:** 2 hours
- **Final polish:** 2 hours

**TOTAL:** ~13-14 hours of focused development

---

## RECOMMENDED APPROACH

Given token limits and complexity, here's the optimal strategy:

### Option A: Phased Implementation (Recommended)
1. **Phase 1 (NOW):** Complete Turnstile removal + test build
2. **Phase 2:** Database + core logic
3. **Phase 3:** API endpoints
4. **Phase 4:** UI + email
5. **Phase 5:** Tests + deploy

### Option B: Continue in New Session
Start fresh with:
1. Review `docs/auth/MAGIC_LINK_PLAN.md`
2. Follow implementation steps 2-11
3. Use completed Turnstile removal as foundation

---

## CRITICAL FILES TO CREATE

Here are the template files that MUST be created:

### 1. Token Generation (`lib/auth/magic-link.ts`)
```typescript
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const PEPPER = process.env.MAGIC_LINK_PEPPER || 'default-pepper-change-me';

export async function generateMagicLinkToken(
  email: string,
  purpose: 'SIGNIN' | 'VERIFY' | 'RESET' | 'ADMIN',
  metadata?: { ip?: string; userAgent?: string; userId?: string }
) {
  // Generate 32-byte random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  
  // Hash with pepper
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken + PEPPER)
    .digest('hex');
  
  // Set expiry
  const expiryMinutes = purpose === 'RESET' ? 30 : 15;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  // Store in database
  await prisma.magicLinkToken.create({
    data: {
      email,
      purpose,
      tokenHash,
      expiresAt,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      userId: metadata?.userId,
    },
  });
  
  return {
    rawToken, // Only time this is available - must send via email
    expiresAt,
  };
}

export async function validateMagicLinkToken(
  rawToken: string,
  purpose: string
) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken + PEPPER)
    .digest('hex');
  
  const token = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });
  
  if (!token) {
    return { valid: false, error: 'TOKEN_NOT_FOUND' };
  }
  
  if (token.purpose !== purpose) {
    return { valid: false, error: 'PURPOSE_MISMATCH' };
  }
  
  if (token.usedAt) {
    return { valid: false, error: 'TOKEN_ALREADY_USED' };
  }
  
  if (new Date() > token.expiresAt) {
    return { valid: false, error: 'TOKEN_EXPIRED' };
  }
  
  // Mark as used (transaction)
  await prisma.magicLinkToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  
  return {
    valid: true,
    email: token.email,
    userId: token.userId,
    purpose: token.purpose,
  };
}
```

### 2. Rate Limiting (`lib/auth/rate-limit.ts`)
```typescript
import { prisma } from '@/lib/prisma';

const LIMITS = {
  email: { requests: 1, windowSeconds: 60 },
  emailDaily: { requests: 10, windowSeconds: 86400 },
  ip: { requests: 30, windowSeconds: 86400 },
};

export async function checkRateLimit(
  key: string,
  type: 'email' | 'emailDaily' | 'ip'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limit = LIMITS[type];
  const now = new Date();
  const bucketKey = `${type}:${key}`;
  
  // Get or create bucket
  let bucket = await prisma.rateLimitBucket.findUnique({
    where: { key: bucketKey },
  });
  
  if (!bucket || now > bucket.resetAt) {
    // Create new bucket or reset
    bucket = await prisma.rateLimitBucket.upsert({
      where: { key: bucketKey },
      create: {
        key: bucketKey,
        count: 1,
        resetAt: new Date(now.getTime() + limit.windowSeconds * 1000),
      },
      update: {
        count: 1,
        resetAt: new Date(now.getTime() + limit.windowSeconds * 1000),
      },
    });
    
    return { allowed: true };
  }
  
  if (bucket.count >= limit.requests) {
    const retryAfter = Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment
  await prisma.rateLimitBucket.update({
    where: { key: bucketKey },
    data: { count: bucket.count + 1 },
  });
  
  return { allowed: true };
}
```

---

## DEPLOYMENT CHECKLIST

Before deploying:

- [ ] All Turnstile removed
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Database migration run
- [ ] Environment variables set:
  - `MAGIC_LINK_PEPPER`
  - `ADMIN_EMAILS`
  - `SMTP_*` (all configured)
- [ ] Email sending tested
- [ ] Magic link flow tested locally
- [ ] Admin step-up tested
- [ ] Production env configured
- [ ] Deploy script ready

---

## GET HELP

If stuck, reference:
- `docs/auth/MAGIC_LINK_PLAN.md` - Full implementation plan
- `docs/auth/TURNSTILE_REMOVAL.md` - What was removed
- `ENTERPRISE_BASELINE_LOCK.md` - Project standards

**Current status: Foundation laid, ~85% of work remains. Ready for focused implementation sprint.**
