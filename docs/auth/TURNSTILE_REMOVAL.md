# Turnstile/CAPTCHA Removal Documentation

**Date:** 2026-02-12  
**Status:** In Progress - Magic Link Migration

---

## Why Turnstile Was Removed

Cloudflare Turnstile CAPTCHA was causing production issues:
- **User Impact:** "Bot protection verification failed" error blocking legitimate users
- **Login Failures:** Users unable to authenticate due to Turnstile verification failures
- **Cloudflare CDN Issues:** Cache serving stale builds with broken Turnstile configuration

**Decision:** Replace with Magic Link authentication - eliminates CAPTCHA friction while maintaining security through email verification and rate limiting.

---

## Files Removed

### Core Turnstile Files
- ✅ `lib/bot-protection.ts` - Turnstile verification logic (DELETED)
- ✅ `app/components/TurnstileWidget.tsx` - React widget component (DELETED)

### Files Modified

#### Backend - Security Layer
- ✅ `lib/security/middleware.ts`
  - Removed `requireTurnstile` option
  - Removed `extractTurnstileToken` option
  - Removed `turnstileError` and `turnstileErrorCodes` from result
  - Removed entire Turnstile verification section

- ✅ `lib/security/validation-schemas.ts`
  - Removed `turnstileToken` field from:
    - `loginSchema`
    - `registerSchema`
    - `registerExtendedSchema`
    - `listingCreateSchema`
    - `messageSendSchema`
    - `reportCreateSchema`
    - `uploadBase64Schema`

#### Backend - API Routes
- ✅ `app/api/auth/login/route.ts`
  - Removed `requireTurnstile: true`
  - Removed `extractTurnstileToken` function
  - Removed Turnstile error handling

- ✅ `app/api/auth/register/route.ts`
  - Removed `requireTurnstile: true`
  - Removed `extractTurnstileToken` function
  - Removed Turnstile error handling

- ✅ `app/api/auth/register-extended/route.ts`
  - Removed `TURNSTILE_CONFIG` import
  - Removed `requireTurnstile: TURNSTILE_CONFIG.enabled`
  - Removed `extractTurnstileToken` function
  - Removed Turnstile error handling

#### Frontend - UI Components (TODO)
- ⏳ `app/components/LoginForm.tsx`
  - Remove TurnstileWidget import and usage
  - Remove turnstileToken state
  - Remove token validation logic

- ⏳ `app/components/SignupFormExtended.tsx`
  - Remove TurnstileWidget import and usage
  - Remove turnstileToken state
  - Remove token sending logic

- ⏳ `app/components/CreateListingFlow.tsx`
  - Remove TurnstileWidget import and usage
  - Remove turnstileToken state

- ⏳ `app/components/OptimizedListingFlow.tsx`
  - Remove TurnstileWidget import and usage
  - Remove turnstileToken state

- ⏳ `app/components/ReportButton.tsx`
  - Remove TurnstileWidget import and usage

#### Infrastructure
- ⏳ `infrastructure/cloudflare-rules.json`
  - Remove `turnstile_protection` rules

---

## Environment Variables

### Removed
```bash
# DELETE these from all .env files:
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

### Added for Magic Link
```bash
# Add these to .env:
MAGIC_LINK_PEPPER="your-random-secure-string-change-in-production"
ADMIN_EMAILS="admin@clickanunt.ro,owner@clickanunt.ro"

# Email (already exists, ensure configured):
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="ClickAnunt <noreply@clickanunt.ro>"
SMTP_SECURE="false"
```

---

## Security Replacement Strategy

### Old: Turnstile CAPTCHA
- ❌ User friction (CAPTCHA challenge)
- ❌ Third-party dependency (Cloudflare)
- ❌ Configuration complexity
- ❌ Production failures blocking users

### New: Magic Link + Rate Limiting
- ✅ Zero friction (email-based)
- ✅ Self-contained (no external dependencies)
- ✅ Strong security through:
  - Cryptographically secure tokens (32-byte random)
  - SHA256 hashing with server pepper
  - 15-minute expiry
  - Single-use tokens
  - Rate limiting (per email & IP)
  - Audit logging

### Rate Limiting (Anti-Abuse)
- **Per Email:**
  - 1 request / 60 seconds (cooldown)
  - 10 requests / 24 hours
- **Per IP:**
  - 30 requests / 24 hours
- **Enforcement:** HTTP 429 with Retry-After header

---

## Migration Impact

### Breaking Changes
- ✅ Login/register APIs no longer require `turnstileToken` field
- ✅ Validation schemas updated
- ⏳ UI components need update (remove widget)

### Backwards Compatibility
- ✅ Existing users can still use password login
- ✅ No database migration required for Turnstile removal
- ✅ Session management unchanged

### New Functionality
- ⏳ Magic link authentication (passwordless)
- ⏳ Admin step-up verification
- ⏳ Audit logging for all auth events

---

## Testing Status

### Backend
- ✅ Validation schemas updated (no turnstileToken)
- ✅ Middleware updated (no Turnstile checks)
- ✅ API routes updated (login, register, register-extended)
- ⏳ Build test pending
- ⏳ API tests need update

### Frontend
- ⏳ Components need Turnstile widget removal
- ⏳ UI tests need update

---

## Next Steps

1. ⏳ Remove Turnstile from remaining UI components
2. ⏳ Remove Turnstile from infrastructure config
3. ⏳ Test build passes
4. ⏳ Implement Magic Link system
5. ⏳ Update all tests
6. ⏳ Deploy to production

---

## Rollback Plan (If Needed)

If magic link implementation faces issues:
1. Git revert Turnstile removal commits
2. Restore `TURNSTILE_*` env vars
3. Re-enable Cloudflare Turnstile rules
4. Deploy previous build

**Note:** Not recommended - Turnstile was causing production issues. Magic link is the forward path.

---

**Status:** Step 1 Complete (Backend Turnstile Removal)  
**Next:** Complete UI component updates and build test
