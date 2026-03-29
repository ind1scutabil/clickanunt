# 🔒 ENTERPRISE BASELINE LOCK

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-12  
**Status:** LOCKED ✓

This document defines the strict architectural standards and deployment protocols for this enterprise-grade application. **These standards are mandatory and violations will cause deployment failures.**

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Deployment Protocol](#deployment-protocol)
3. [Build & Quality Standards](#build--quality-standards)
4. [Environment Management](#environment-management)
5. [Security Requirements](#security-requirements)
6. [Coding Standards](#coding-standards)
7. [Testing Requirements](#testing-requirements)
8. [Forbidden Practices](#forbidden-practices)

---

## 🏗️ Project Structure

### Required Root Directory Structure

```
auto-platform/
├── app/                    # Next.js 16 app directory
├── lib/                    # Shared libraries and utilities
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── scripts/                # Automation scripts
├── tests/                  # Test suites
├── docs/                   # Documentation
├── infrastructure/         # Infrastructure configs (nginx, cloudflare)
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── docker-compose.yml      # Container orchestration
├── instrumentation.ts      # App startup hooks
├── README.md               # Project overview
└── .env.example            # Environment template
```

### ⛔ Forbidden Root Files

The following file types are **prohibited** in the root directory:

- Duplicate deploy scripts (e.g., `deploy.sh`, `quick-deploy.sh`, `auto-deploy.sh`)
- Backup env files (`.env.bak`, `.env.production`, `.env.local`)
- Legacy configuration files (`ecosystem.config.js`, `proxy.ts`, `middleware-logger.ts`)
- Temporary/build artifacts (`.tsbuildinfo`, `*.log`)
- Archive files (`*.tar.gz`, `*.zip`)
- Duplicate documentation (only `README.md` allowed in root)

**Enforcement:** CI/CD will fail if unauthorized files are detected.

---

## 🚀 Deployment Protocol

### Single Source of Truth

**ONLY ONE deployment method is authorized:**

```bash
./scripts/deploy-production.sh
```

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. npm ci           - Clean dependency install              │
│ 2. npm run lint     - Enforce zero warnings                 │
│ 3. npm run type-check - TypeScript validation               │
│ 4. npm run test     - Run test suite                        │
│ 5. npm run build    - Production build                      │
│ 6. rsync to server  - Sync code to production               │
│ 7. npm ci (server)  - Install production deps               │
│ 8. prisma migrate   - Apply database migrations             │
│ 9. npm run build    - Build on server                       │
│ 10. pm2 restart     - Restart application                   │
│ 11. health check    - Verify /api/health                    │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Failure Conditions

The deployment script will **immediately fail** if:

- Any lint warnings or errors exist
- Type checking fails
- Any test fails
- Build fails
- Database migration fails
- Health check returns non-200 status

**No partial deployments are allowed.**

---

## ✅ Build & Quality Standards

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "test": "jest --passWithNoTests",
    "verify": "npm run lint && npm run type-check && npm run test"
  }
}
```

### Pre-Deployment Requirements

Before any production deployment, the following **must pass**:

```bash
npm run verify
```

This runs in sequence:
1. **Lint** - Zero warnings allowed (`--max-warnings=0`)
2. **Type Check** - No TypeScript errors
3. **Test** - All tests must pass

### Build Validation

```bash
npm run build
```

Must complete with:
- Zero TypeScript errors
- Zero build failures
- All routes compiled successfully

---

## 🔐 Environment Management

### Committed Files

**ONLY** `.env.example` is committed to version control.

### Ignored Files (`.gitignore`)

```
.env
.env.local
.env.production
.env.*.local
```

### Required Environment Variables

The application validates these variables at startup via `instrumentation.ts`:

**Critical (App will crash if missing):**
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

**Optional (Warnings only):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- `REDIS_URL`

### Environment Validation

Environment validation runs automatically at startup via:

```typescript
// instrumentation.ts
import { enforceEnvironment } from './lib/env-validator';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    enforceEnvironment();
  }
}
```

**Configuration:**

```typescript
// next.config.ts
experimental: {
  instrumentationHook: true,
}
```

---

## 🛡️ Security Requirements

### Turnstile Bot Protection

**Server-side validation required:**

```typescript
// lib/bot-protection.ts
// Uses application/x-www-form-urlencoded (NOT JSON)
const formData = new URLSearchParams();
formData.append('secret', secretKey);
formData.append('response', token);
```

**Client-side requirements:**
- Turnstile widget must load before form submission
- Token must be included in all login/register requests
- Widget must handle error and expired callbacks

### CSRF Protection

- CSRF tokens stored in HTTP-only cookies
- Validated on all state-changing operations
- Generated per-session

### Protected Routes

Middleware enforces authentication for:
- `/dashboard/*`
- `/admin/*`
- `/api/user/*`
- `/api/admin/*`

### Security Headers

Configured in `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (restrictive)

---

## 💻 Coding Standards

### TypeScript

- **Strict mode enabled** (`tsconfig.json`)
- No `any` types (use `unknown` with type guards)
- Explicit return types on public functions
- No `@ts-ignore` (use `@ts-expect-error` only when necessary with explanation)

### Code Organization

```
lib/
├── auth/           # Authentication utilities
├── security/       # Security middleware
├── bot-protection.ts
├── env-validator.ts
├── prisma.ts
└── ...

app/
├── api/            # API routes
├── components/     # React components
├── (auth)/         # Auth route group
├── dashboard/      # Dashboard pages
└── ...
```

### Import Standards

```typescript
// Absolute imports using @ alias
import { prisma } from '@/lib/prisma';
import { verifyTurnstile } from '@/lib/bot-protection';

// NOT: import prisma from '../../../lib/prisma';
```

### Error Handling

```typescript
// Always log errors with context
console.error('[COMPONENT_NAME] Error description:', error);

// Return structured error responses
return NextResponse.json(
  { error: 'User-friendly message', errorCodes: ['CODE'] },
  { status: 400 }
);
```

---

## 🧪 Testing Requirements

### Test Coverage

- **Minimum 70% coverage** (currently enforced in `jest.config.js`)
- All critical paths must have tests
- API endpoints require integration tests

### Test Structure

```typescript
describe('Feature Name', () => {
  test('should handle expected case', () => {
    // Arrange
    // Act
    // Assert
  });

  test('should handle error case', () => {
    // Test error handling
  });
});
```

### Core Functionality Tests

Required tests (see `tests/core-functionality.test.ts`):
- Health endpoint availability
- Environment variable validation
- Security configuration
- Project structure validation
- Single deploy script enforcement

---

## ⛔ Forbidden Practices

### 🚫 DO NOT:

1. **Create duplicate deploy scripts**
   - Only `scripts/deploy-production.sh` is authorized
   - Any script named `deploy*.sh` will be rejected

2. **Commit environment files**
   - Never commit `.env`, `.env.local`, `.env.production`
   - Only `.env.example` is allowed

3. **Bypass quality checks**
   - Do not use `--no-verify` in git hooks
   - Do not skip lint/test/typecheck steps

4. **Use console.log in production**
   - Production builds automatically remove console logs
   - Use structured logging (`console.error` with context)

5. **Hardcode secrets**
   - All secrets must be in environment variables
   - Never commit API keys, passwords, or tokens

6. **Deploy without testing**
   - All changes must pass `npm run verify`
   - Manual deployments are prohibited

7. **Create backup files in root**
   - No `.bak`, `.old`, `.tmp` files
   - Use git for version control

8. **Modify deployed code directly**
   - No SSH editing of production files
   - All changes must go through deployment pipeline

---

## 📊 Monitoring & Health

### Health Check Endpoint

```bash
GET /api/health
```

**Success Response (200):**
```json
{
  "status": "ok",
  "db": "connected",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-02-12T10:30:00Z",
  "responseTime": "15ms",
  "checks": {
    "database": "✓",
    "server": "✓"
  }
}
```

**Failure Response (503):**
```json
{
  "status": "error",
  "db": "disconnected",
  "error": "Connection refused",
  "version": "1.0.0",
  "timestamp": "2026-02-12T10:30:00Z",
  "responseTime": "5000ms"
}
```

### Monitoring Requirements

- Health check must return 200 for successful deployment
- Database connectivity validated on every request
- Response time logged for performance monitoring

---

## 🔄 Change Management

### Making Changes to This Document

1. Changes must be approved by technical lead
2. Version number must be incremented
3. Last Updated date must be current
4. All team members must be notified

### Updating Standards

To update coding standards or deployment protocols:

1. Create proposal document in `docs/proposals/`
2. Get approval from technical lead
3. Update this document
4. Update affected code/scripts
5. Communicate changes to team

---

## ✅ Compliance Checklist

Before deploying to production, verify:

- [ ] Only authorized files in root directory
- [ ] Single deploy script (`scripts/deploy-production.sh`)
- [ ] `.env.example` up to date
- [ ] No committed secrets or environment files
- [ ] `npm run verify` passes (lint, type-check, test)
- [ ] `npm run build` succeeds
- [ ] All required environment variables configured
- [ ] Health endpoint returns 200
- [ ] Database migrations applied
- [ ] Cloudflare cache purged (if needed)

---

## 📞 Support & Escalation

**Technical Issues:**
- Check logs: `ssh root@46.225.69.155 'pm2 logs clickanunt --lines 50'`
- Review health endpoint: `https://www.clickanunt.ro/api/health`
- Check deployment logs in CI/CD

**Deployment Failures:**
1. Review error output from deployment script
2. Verify all pre-deployment checks passed
3. Check server logs for runtime errors
4. Validate database connectivity

**Security Concerns:**
- Immediately rotate affected credentials
- Review security logs
- Update environment variables
- Redeploy with updated secrets

---

## 📝 Document History

| Version | Date       | Changes                           | Author |
|---------|------------|-----------------------------------|--------|
| 1.0.0   | 2026-02-12 | Initial enterprise baseline lock  | System |

---

**END OF DOCUMENT**

⚠️ **This is a locked configuration. Violations will result in deployment failures.**
