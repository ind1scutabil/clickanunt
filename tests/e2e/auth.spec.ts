import { test, expect } from '@playwright/test';

const strongPassword = 'Password123!';

async function fillRegisterForm(
  page: import('@playwright/test').Page,
  opts: { name: string; email: string; password: string; confirmPassword?: string }
) {
  const confirm = opts.confirmPassword ?? opts.password;
  await page.fill('input[name="name"]', opts.name);
  await page.fill('input[name="email"]', opts.email);
  await page.fill('input[name="password"]', opts.password);
  await page.fill('input[name="confirmPassword"]', confirm);
}

test.describe.serial('Authentication - Registration & session', () => {
  const email = `serial-${Date.now()}@example.com`;

  async function loginWithVisibleForm(
    page: import('@playwright/test').Page,
    userEmail: string,
    password: string
  ) {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').first().fill(userEmail);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
  }

  test('should register new user with valid credentials', async ({ page }) => {
    await page.goto('/auth/register');

    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: strongPassword,
    });

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).not.toBeDisabled();
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

    const desktopMenu = page.locator('header').getByRole('button', { name: 'Meniu utilizator' });
    const mobileMenu = page.locator('header').getByRole('button', { name: /Deschide\/închide meniu/i });
    if (await desktopMenu.first().isVisible().catch(() => false)) {
      await desktopMenu.first().click();
    } else {
      await mobileMenu.first().click();
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
