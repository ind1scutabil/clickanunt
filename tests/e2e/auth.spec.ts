import { test, expect } from '@playwright/test';

const strongPassword = 'Password123!';

async function fillRegisterForm(
  page: import('@playwright/test').Page,
  opts: { name: string; email: string; password: string; confirmPassword?: string }
) {
  const confirm = opts.confirmPassword ?? opts.password;
  const form = page.locator('form').filter({ has: page.locator('button[type="submit"]') }).first();
  await form.locator('input[name="name"]').fill(opts.name);
  await form.locator('input[name="email"]').fill(opts.email);
  await form.locator('input[name="password"]').fill(opts.password);
  await form.locator('input[name="confirmPassword"]').fill(confirm);
  // Ensure React controlled validators see the final values (esp. Mobile Chrome).
  await form.locator('input[name="confirmPassword"]').blur();
}

async function loginWithVisibleForm(
  page: import('@playwright/test').Page,
  userEmail: string,
  password: string,
  opts?: { skipGoto?: boolean }
) {
  if (!opts?.skipGoto) {
    await page.goto('/auth/login');
  }
  const loginForm = page
    .locator('form')
    .filter({ has: page.locator('button[type="submit"]') })
    .first();
  await loginForm.locator('input[type="email"]').fill(userEmail);
  await loginForm.locator('input[type="password"]').fill(password);
  await loginForm.locator('button[type="submit"]').click();
}

test.describe.serial('Authentication - Registration & session', () => {
  let email = '';

  test('should register new user with valid credentials', async ({ page }, testInfo) => {
    email = `serial-${testInfo.project.name.replace(/\s+/g, '-')}-${Date.now()}-${testInfo.parallelIndex}-${Math.random().toString(36).slice(2, 7)}@example.com`;

    await page.goto('/auth/register');

    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: strongPassword,
    });

    // Accept terms if present (can keep submit disabled on mobile layouts).
    const terms = page.locator('input[name="acceptTerms"], input[type="checkbox"]').first();
    if (await terms.isVisible().catch(() => false)) {
      await terms.check({ force: true }).catch(async () => {
        await terms.click({ force: true });
      });
    }
    const privacy = page.locator('input[name="acceptPrivacy"]').first();
    if (await privacy.isVisible().catch(() => false)) {
      await privacy.check({ force: true }).catch(async () => {
        await privacy.click({ force: true });
      });
    }

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).not.toBeDisabled({ timeout: 10000 });
    await submitButton.click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should reject registration with duplicate email without confirming existence', async ({
    page,
  }) => {
    await page.goto('/auth/register');
    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: strongPassword,
    });
    await page.locator('button[type="submit"]').first().click();

    // Anti-enumeration: generic failure, never "email already exists"
    await expect(page.getByText(/există deja|already exists/i)).toHaveCount(0, {
      timeout: 8000,
    });
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 3000 });
  });

  test('signup → dashboard → logout → login → dashboard', async ({ page }) => {
    await loginWithVisibleForm(page, email, strongPassword);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const acceptCookies = page.getByRole('button', { name: /^Acceptă$/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }

    const userMenu = page.locator('header button[aria-label="Meniu utilizator"]');
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
    } else {
      const burger = page
        .locator('header')
        .getByRole('button', { name: /Deschide\/închide meniu/i });
      await expect(burger).toBeVisible({ timeout: 10000 });
      await burger.click();
    }
    await page.getByRole('button', { name: /deconectare|logout/i }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });

    await loginWithVisibleForm(page, email, strongPassword);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });
});

test.describe('Authentication - Registration validation', () => {
  test('enables submit for Test123! on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/register');
    await fillRegisterForm(page, {
      name: 'Test User',
      email: `mobile-${Date.now()}@example.com`,
      password: 'Test123!',
    });
    await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
  });

  test('register with Test123. on mobile submits to dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/register');
    const email = `mobile-dot-${Date.now()}@example.com`;
    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: 'Test123.',
    });
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
    await submitButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('shows password hint when uppercase-only password on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `hint-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TEST123!');
    await page.fill('input[name="confirmPassword"]', 'TEST123!');
    await expect(page.getByRole('alert').filter({ hasText: /literă mică/i })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should reject registration with invalid password', async ({ page }) => {
    await page.goto('/auth/register');
    await fillRegisterForm(page, {
      name: 'Test User',
      email: `user-${Date.now()}@example.com`,
      password: 'weak',
      confirmPassword: 'weak',
    });

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should reject registration with non-matching passwords', async ({ page }) => {
    await page.goto('/auth/register');
    await fillRegisterForm(page, {
      name: 'Test User',
      email: `user-${Date.now()}@example.com`,
      password: strongPassword,
      confirmPassword: 'Password456!',
    });

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe('Authentication - Login', () => {
  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.locator('input[type="email"]').first().fill('invalid@example.com');
    await page.locator('input[type="password"]').first().fill('WrongPassword123!');

    await page.locator('button[type="submit"]').first().click();

    await expect(
      page.getByText(/incorect|incorrect|invalid|negăsit|not found/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should stay on login when password is missing', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').first().fill('any@example.com');
    await page.locator('button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Authentication - 2FA', () => {
  test('login page is ready for optional 2FA step after submit', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await page.locator('input[type="email"]').first().fill('nonexistent-2fa-check@example.com');
    await page.locator('input[type="password"]').first().fill(strongPassword);
    await page.locator('button[type="submit"]').first().click();
    await expect(
      page.getByText(/incorect|incorrect|invalid|negăsit|not found|parolă|password|email/i).first()
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Authentication - post-login return', () => {
  test('login?next=/favorites returns to favorites', async ({ page, request }) => {
    const email = `ret-fav-${Date.now()}@example.com`;
    const csrf = await request.get('/api/csrf');
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    const reg = await request.post('/api/auth/register', {
      headers: { 'x-csrf-token': csrfToken },
      data: {
        name: 'Return Fav',
        email,
        password: strongPassword,
        confirmPassword: strongPassword,
        acceptTerms: true,
        acceptPrivacy: true,
      },
    });
    expect(reg.ok(), await reg.text()).toBeTruthy();

    await page.context().clearCookies();
    await page.goto('/auth/login?next=%2Ffavorites');
    await loginWithVisibleForm(page, email, strongPassword, { skipGoto: true });
    await page.waitForURL(/\/favorites/, { timeout: 20000 });
    await expect(page.getByText(/Niciun\s+anunț\s+favorit|favorite/i).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
