# Magic Link Authentication Implementation Plan

**Date:** 2026-02-12  
**Status:** Discovery Complete

---

## Current Stack Analysis

### 1. Framework & Structure
- **Next.js:** 16.1.6 with App Router (`app/` directory)
- **Database:** PostgreSQL with Prisma 5.22.0
- **Auth System:** Custom JWT-based authentication
  - Files: `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`
  - Current: Email/password + 2FA (TOTP)
  - Session: JWT tokens with refresh mechanism

### 2. User Model (Prisma)
```prisma
model User {
  id                  String @id @default(uuid())
  email               String @unique
  password            String
  role                UserRole @default(user)
  accountType         AccountType @default(private)
  verificationLevel   VerificationLevel @default(none)
  emailVerified       Boolean @default(false)
  phoneVerified       Boolean @default(false)
  // ... business fields, 2FA fields, etc.
}
```

**Key Fields:**
- `emailVerified`: Already exists ✓
- `password`: Will become optional for magic link users
- `role`: admin/moderator/user roles exist

### 3. Email Sending (Nodemailer)
- **File:** `lib/email.ts` (existing)
- **Provider:** Nodemailer with SMTP
- **Current Env Vars:**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`
- **Status:** ✓ Working, supports HTML emails, has mock mode for development

### 4. Rate Limiting
- **Files:** `lib/distributed-rate-limit.ts`, `lib/cache.ts`
- **Backend:** Redis with IORedis (optional, falls back to memory)
- **Current Env:** `REDIS_URL` (optional)
- **Status:** ✓ Infrastructure exists, need to adapt for magic link endpoints

### 5. Turnstile/CAPTCHA Usage
**Heavy usage across:**
- `lib/bot-protection.ts` - Verification logic
- `lib/security/middleware.ts` - Middleware integration
- `lib/security/validation-schemas.ts` - Zod schemas with `turnstileToken` field
- `app/components/TurnstileWidget.tsx` - React component
- `app/components/LoginForm.tsx` - Login integration
- `app/components/SignupFormExtended.tsx` - Signup integration
- `app/api/auth/login/route.ts` - Backend validation
- `app/api/auth/register/route.ts` - Backend validation
- `infrastructure/cloudflare-rules.json` - Cloudflare config
- **Env Vars:** `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

### 6. Deployment
- **Method:** PM2 on Ubuntu VPS (root@46.225.69.155)
- **Script:** `scripts/deploy-production.sh` (single source of truth)
- **Server Path:** `/var/www/clickanunt`
- **Reverse Proxy:** Nginx
- **Domain:** www.clickanunt.ro

---

## Implementation Plan

### Files to Create

#### Database (Prisma)
1. `prisma/migrations/YYYYMMDDHHMMSS_add_magic_link_auth/migration.sql`
   - Add `MagicLinkToken` model
   - Add `AuthAuditLog` model
   - Add `RateLimitBucket` model (DB-backed rate limiting)
   - Modify User model: make `password` optional

#### Backend - Core Logic
2. `lib/auth/magic-link.ts`
   - Token generation (32-byte crypto random)
   - Token hashing (sha256 + server pepper)
   - Token validation and consumption
   - Purpose-specific logic (SIGNIN, VERIFY, RESET, ADMIN)

3. `lib/auth/rate-limit.ts`
   - Email-based rate limiting (1/60s, 10/24h)
   - IP-based rate limiting (30/24h)
   - Redis or DB-backed implementation
   - Returns Retry-After header

4. `lib/auth/admin-step-up.ts`
   - Admin email list validation
   - Session step-up tracking
   - Middleware for admin routes

5. `lib/auth/audit-log.ts`
   - Structured audit logging
   - Email masking (d***@g***.com)
   - Event types enum

#### Backend - API Routes
6. `app/api/auth/magic-link/request/route.ts`
   - POST handler
   - Rate limit check
   - Token creation
   - Email sending
   - Returns 200/429

7. `app/api/auth/magic-link/consume/route.ts`
   - GET handler
   - Token validation
   - Purpose routing (SIGNIN/VERIFY/RESET/ADMIN)
   - Session creation
   - Audit logging

8. `app/api/auth/magic-link/test-retrieve/route.ts`
   - TEST ONLY (guarded by NODE_ENV=test)
   - Returns last sent magic link for E2E tests

#### Frontend - Pages
9. `app/auth/signin/page.tsx` (modify existing)
   - Email input form
   - Remove password field (default view)
   - Add "Use password instead" link (fallback)
   - Magic link request flow

10. `app/auth/check-email/page.tsx` (new)
    - "Check your inbox" message
    - Resend cooldown timer
    - Spam folder reminder

11. `app/auth/magic/page.tsx` (new)
    - Auto-consume token from URL
    - Loading states
    - Error handling (expired/used/invalid)
    - Redirect on success

12. `app/admin/verify/page.tsx` (new)
    - Admin step-up form
    - Email input for ADMIN purpose link

#### Frontend - Components
13. `app/components/MagicLinkForm.tsx`
    - Reusable magic link request form
    - Email validation
    - Loading states

14. `app/components/MagicLinkStatus.tsx`
    - Token consumption UI
    - Progress indicator
    - Error messages

#### Email Templates
15. `lib/email/templates/magic-link.ts`
    - HTML email template
    - Purpose-specific subjects
    - CTA button + fallback link
    - ClickAnunt branding

#### Scripts
16. `scripts/verify-email-smtp.sh`
    - Test SMTP configuration
    - Send test email to provided address
    - Print success/failure

17. `scripts/smoke-prod.sh`
    - Homepage health check
    - /api/health endpoint check
    - Magic link request endpoint check (optional)

#### Documentation
18. `docs/auth/MAGIC_LINK.md`
    - Setup instructions
    - Environment variables
    - Usage guide
    - Admin step-up flow

19. `docs/auth/TURNSTILE_REMOVAL.md`
    - Why removed (blocking users)
    - Migration notes

### Files to Modify

#### Remove Turnstile
20. `lib/bot-protection.ts` - DELETE or stub
21. `lib/security/middleware.ts` - Remove Turnstile checks
22. `lib/security/validation-schemas.ts` - Remove `turnstileToken` fields
23. `app/components/TurnstileWidget.tsx` - DELETE
24. `app/components/LoginForm.tsx` - Remove Turnstile integration
25. `app/components/SignupFormExtended.tsx` - Remove Turnstile integration
26. `app/api/auth/login/route.ts` - Remove Turnstile validation
27. `app/api/auth/register/route.ts` - Remove Turnstile validation
28. `infrastructure/cloudflare-rules.json` - Remove Turnstile rules
29. `.env.example` - Remove `TURNSTILE_*` vars

#### Adapt Existing
30. `lib/email.ts` - Ensure sendEmail function is compatible
31. `lib/mailer.ts` - May need updates for magic link emails
32. `prisma/schema.prisma` - Add new models, modify User
33. `middleware.ts` (if exists) - Add admin step-up check
34. `app/api/auth/logout/route.ts` - Ensure session clearing works

### Environment Variables

#### Required (Add to .env.example)
```bash
# Magic Link Configuration
MAGIC_LINK_PEPPER="random-secure-string-change-in-production"
ADMIN_EMAILS="admin@clickanunt.ro,owner@clickanunt.ro"

# Email (already exists)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="ClickAnunt <noreply@clickanunt.ro>"
SMTP_SECURE="false"

# Optional: Redis for rate limiting
REDIS_URL="redis://localhost:6379"

# Session (existing)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://www.clickanunt.ro"
```

#### Remove
```bash
TURNSTILE_SECRET_KEY  # DELETE
NEXT_PUBLIC_TURNSTILE_SITE_KEY  # DELETE
```

---

## Migration Steps

### Phase 1: Database (Non-breaking)
1. Create Prisma migration with new models
2. Run migration on dev database
3. Test locally

### Phase 2: Remove Turnstile (Breaking)
1. Delete/stub Turnstile files
2. Remove from validation schemas
3. Remove from UI components
4. Remove from API routes
5. Update env templates
6. Test build passes

### Phase 3: Magic Link Implementation
1. Implement core logic (token generation, validation)
2. Implement API endpoints
3. Implement UI pages/components
4. Implement email templates
5. Test locally

### Phase 4: Testing
1. Unit tests (Jest)
2. E2E tests (Playwright)
3. SMTP verification script
4. Smoke test script

### Phase 5: Deployment
1. Update production .env
2. Run database migration on prod
3. Deploy via scripts/deploy-production.sh
4. Run smoke tests
5. Verify /api/health

---

## Risk Mitigation

### Backwards Compatibility
- Keep password login as fallback (hide behind "Use password instead")
- Existing users can still use password
- New users default to magic link

### Rate Limiting
- Prevent abuse without CAPTCHA
- Per-email cooldown: 1 request / 60 seconds
- Per-email daily: 10 requests / 24 hours
- Per-IP daily: 30 requests / 24 hours

### Security
- Token: 32-byte crypto random
- Storage: SHA256(token + pepper), never raw token
- Expiry: 15 min (SIGNIN/VERIFY/ADMIN), 30 min (RESET)
- Single-use: Mark usedAt in transaction
- Audit: Log all events, mask emails

### Email Deliverability
- Use verified SMTP credentials
- Add SPF/DKIM records (out of scope, document)
- Provide spam folder reminder in UI

---

## Success Criteria

- [ ] Users can sign in via magic link
- [ ] Admin access requires step-up magic link
- [ ] No Turnstile/CAPTCHA remains anywhere
- [ ] All tests pass (unit + E2E)
- [ ] Build succeeds
- [ ] Deployment works via single script
- [ ] /api/health returns 200
- [ ] Production smoke tests pass

---

**Next Step:** Begin STEP 1 - Remove Turnstile completely
