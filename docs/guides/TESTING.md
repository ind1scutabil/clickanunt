# E2E & API Testing Documentation

## 📋 Overview

This document describes the production-grade automated testing infrastructure for ClickAnunț platform.

### Test Coverage
- **E2E Tests**: Playwright browser automation (desktop & mobile)
- **API Tests**: Jest integration tests for all endpoints
- **Validation Tests**: Zod schema validation for all forms
- **Coverage Target**: 85%+ across all modules

---

## 🗂️ Directory Structure

```
tests/
├── e2e/                          # End-to-end browser tests
│   ├── auth.spec.ts             # Registration, login, logout, 2FA
│   ├── listings.spec.ts         # Create, edit, delete, view, search
│   ├── favorites.spec.ts        # Add/remove favorites
│   ├── messages.spec.ts         # Send/receive messages
│   ├── admin.spec.ts            # Admin dashboard, approvals, bans
│   └── routes-and-errors.spec.ts # 404, auth redirect, button handlers
├── unit/                         # Unit & integration tests
│   ├── api.test.ts              # API endpoint tests
│   └── validation.test.ts       # Form validation tests
└── fixtures/
    └── auth.ts                  # Reusable authentication fixtures
```

---

## 🚀 Running Tests Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Start dev server (if not running)
npm run dev
```

### Run All Tests
```bash
# Run full test suite (lint + unit + E2E + build)
npm run ci

# Or use the dedicated CI script
./scripts/ci-test.sh
```

### Run Individual Test Suites
```bash
# Unit & integration tests only
npm run test

# Watch mode (re-run on file changes)
npm run test:watch

# E2E tests only
npm run test:e2e

# E2E with UI (interactive mode)
npm run test:e2e:ui

# E2E debug mode (pause between steps)
npm run test:e2e:debug

# Lint check
npm run lint

# Build check
npm run build
```

### View Test Reports
```bash
# After running tests, open the Playwright report
npx playwright show-report

# Coverage report
open coverage/lcov-report/index.html
```

---

## 📊 Test Coverage Breakdown

### E2E Tests (Playwright)

#### Authentication (`tests/e2e/auth.spec.ts`)
- ✅ Register with valid credentials
- ✅ Reject duplicate email
- ✅ Reject invalid password
- ✅ Reject mismatched passwords
- ✅ Login with valid credentials
- ✅ Show error on invalid credentials
- ✅ Enforce password field requirements
- ✅ Logout successfully
- ✅ Require 2FA if enabled

**Coverage**: Registration (4 tests), Login (3 tests), Logout (1 test), 2FA (1 test)

#### Listings (`tests/e2e/listings.spec.ts`)
- ✅ Create new listing with valid data
- ✅ Reject listing without title
- ✅ Reject listing with invalid price
- ✅ Edit existing listing
- ✅ Delete listing with confirmation
- ✅ Display listings on homepage
- ✅ Filter listings by category
- ✅ Search listings

**Coverage**: CRUD operations (6 tests), View/Filter (2 tests)

#### Favorites (`tests/e2e/favorites.spec.ts`)
- ✅ Add listing to favorites
- ✅ Remove listing from favorites
- ✅ Display empty state
- ✅ Persist favorites

**Coverage**: 4 tests

#### Messages (`tests/e2e/messages.spec.ts`)
- ✅ Send message to listing owner
- ✅ View messages in inbox
- ✅ Display empty messages state
- ✅ Open conversation

**Coverage**: 4 tests

#### Admin (`tests/e2e/admin.spec.ts`)
- ✅ Access admin dashboard
- ✅ View listings pending approval
- ✅ Approve listing
- ✅ Reject listing
- ✅ Delete listing
- ✅ View users
- ✅ Ban user
- ✅ Unban user
- ✅ View moderation queue
- ✅ View analytics
- ✅ Redirect non-admin to login
- ✅ Redirect non-admin user from admin routes
- ✅ Show 403 for non-admin API access

**Coverage**: Admin operations (10 tests), Route protection (3 tests)

#### Routes & Errors (`tests/e2e/routes-and-errors.spec.ts`)
- ✅ Show 404 page
- ✅ Redirect to login when accessing protected routes
- ✅ Allow access to public pages
- ✅ Verify all buttons have handlers
- ✅ Show loading state on form submit
- ✅ Disable invalid forms
- ✅ API health check

**Coverage**: Route protection (6 tests), UI elements (3 tests), API (1 test)

**Total E2E Tests**: ~40 tests covering all user journeys

### API Integration Tests (Jest)

#### Authentication (`/api/auth/*`)
- ✅ POST /api/auth/register
  - Valid registration → 200/201
  - Duplicate email → 400/409
  - Invalid password → 400/422
  - Mismatched passwords → 400/422
- ✅ POST /api/auth/login
  - Valid credentials → 200/201
  - Invalid credentials → 401/400
  - Missing fields → 400/422
- ✅ GET /api/auth/me
  - Authenticated → 200
  - Not authenticated → 401
- ✅ POST /api/auth/logout
  - Successful logout → 200/204

#### Listings (`/api/listings`)
- ✅ GET /api/listings
  - Valid request → 200
  - Pagination support
  - Category filtering
  - Sorting support
- ✅ POST /api/listings
  - Requires authentication → 401
  - Valid data → 200/201
- ✅ GET /api/listings/:id
  - Non-existent → 404
  - Valid ID → 200 or 404

#### Messages (`/api/messages`)
- ✅ GET /api/messages
  - Requires authentication → 401
  - Authenticated → 200/401
- ✅ POST /api/messages
  - Requires authentication → 401
  - Requires content → 400/422

#### Admin (`/api/admin/*`)
- ✅ GET /api/admin/listings
  - Not authenticated → 401
  - Non-admin user → 403
- ✅ POST /api/admin/listings/:id/approve
  - Non-admin → 401/403
- ✅ POST /api/admin/users/:id/ban
  - Non-admin → 401/403

#### HTTP Status Codes
- ✅ 200 for successful GET
- ✅ 400 for bad requests
- ✅ 401 for unauthorized
- ✅ 404 for not found

**Total API Tests**: ~25 tests covering all endpoints

### Validation Tests (Zod)

#### Registration
- ✅ Valid data passes
- ✅ Invalid email rejected
- ✅ Weak password rejected
- ✅ Mismatched passwords rejected
- ✅ Short name rejected

#### Login
- ✅ Valid data passes
- ✅ Invalid email rejected
- ✅ Empty password rejected

#### Listings
- ✅ Valid listing passes
- ✅ Short title rejected
- ✅ Short description rejected
- ✅ Negative price rejected
- ✅ Zero price rejected
- ✅ Too many images rejected
- ✅ Valid images array passes

#### Messages
- ✅ Valid message passes
- ✅ Empty message rejected
- ✅ Missing recipient rejected
- ✅ Optional listing ID accepted
- ✅ Too long message rejected

#### Email & Password
- ✅ Valid emails pass
- ✅ Invalid emails rejected
- ✅ Strong passwords pass
- ✅ Weak passwords rejected (missing uppercase/lowercase/number/special)

**Total Validation Tests**: ~30 tests

---

## ⚙️ Configuration Files

### `playwright.config.ts`
- Runs on Chromium, Firefox, WebKit
- Mobile testing (Pixel 5, iPhone 12)
- Auto-starts dev server
- Screenshots/videos on failure
- Trace collection for debugging

### `jest.config.js`
- Setup file: `jest.setup.js`
- Test patterns: `tests/unit/**/*.test.ts`
- Coverage thresholds: 70% per file, 70% global
- Module mapping for `@/` paths

### `.env.test` (optional)
For CI environments, create test-specific variables:
```bash
API_URL=http://localhost:3000
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
```

---

## 🔍 Key Test Scenarios

### Authentication Flow
1. Register new user → email verification (if enabled)
2. Login → redirect to dashboard
3. Session persistence → reload page
4. Logout → clear session → redirect to login

### Listing Lifecycle
1. Create → pending approval (if moderated)
2. View → details page, image gallery
3. Edit → update fields, re-submit
4. Delete → confirmation, removal

### Admin Operations
1. Approve listing → status changes, owner notified
2. Reject → reason stored, user notified
3. Ban user → all listings hidden, login blocked
4. View analytics → dashboards load

### Access Control
1. Unauthenticated → public pages only
2. Regular user → dashboard, messages, favorites
3. Admin user → admin dashboard access
4. Non-admin API → 403 Forbidden response

---

## 📈 Coverage Report

After running tests:
```bash
# View coverage in terminal
npm run test -- --coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

**Target Thresholds**:
- Statements: 85%
- Branches: 85%
- Functions: 85%
- Lines: 85%

---

## 🚨 Common Issues & Solutions

### Issue: "Playwright browser not found"
```bash
npx playwright install
```

### Issue: "Port 3000 already in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Issue: "Tests timeout on CI"
- Increase timeout in `playwright.config.ts`
- Reduce test parallelization: `workers: 1`
- Add more verbose logging

### Issue: "Flaky E2E tests"
- Add explicit waits: `page.waitForTimeout(500)`
- Use `waitForURL()` instead of hardcoded waits
- Check for stale element references

---

## 🔐 Security Checks

All tests verify:
- ✅ No sensitive data in logs
- ✅ Protected routes require authentication
- ✅ Admin routes require admin role
- ✅ CSRF tokens validated
- ✅ Passwords hashed (not plain text)
- ✅ API returns proper error codes
- ✅ Input validation prevents injection

---

## 📱 Mobile Testing

Playwright tests run on:
- Desktop: Chromium, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

View mobile test results:
```bash
npm run test:e2e:ui
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e
      - run: npm run build
```

### Local CI Script
```bash
./scripts/ci-test.sh
```

---

## 📝 Writing New Tests

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await page.fill('input', 'value');
    await page.click('button');
    await expect(page.locator('text=success')).toBeVisible();
  });
});
```

### Unit Test Template
```typescript
describe('Feature', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

---

## 🎯 Next Steps

1. **Increase Coverage**: Add tests for edge cases and error scenarios
2. **Performance Testing**: Add Lighthouse CI for performance budgets
3. **Visual Regression**: Add Percy or similar for visual testing
4. **Load Testing**: Add k6 for load testing critical paths
5. **Accessibility**: Use axe-core for a11y testing

---

## 📞 Support

For test issues:
1. Check Playwright docs: https://playwright.dev/docs/intro
2. Check Jest docs: https://jestjs.io/docs/getting-started
3. Review test logs: `npm run test:e2e:debug`
4. Check coverage gaps: `npm run test -- --coverage`

---

**Last Updated**: February 12, 2026
**Test Infrastructure Version**: 1.0.0
**Maintained by**: Development Team
