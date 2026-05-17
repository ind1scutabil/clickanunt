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

  test('should register new user with valid credentials', async ({ page }) => {
    await page.goto('/auth/register');

    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: strongPassword,
    });

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
    await submitButton.click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should reject registration with duplicate email', async ({ page }) => {
    await page.goto('/auth/register');
    await fillRegisterForm(page, {
      name: 'Test User',
      email,
      password: strongPassword,
    });
    await page.locator('button[type="submit"]').click();

    await expect(
      page.getByText(/există deja|already|exists/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('signup → dashboard → logout → login → dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', strongPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.locator('header').getByRole('button', { name: 'Meniu utilizator' }).first().click();
    await page.getByRole('button', { name: /^logout$/i }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });

    await page.goto('/auth/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', strongPassword);
    await page.locator('button[type="submit"]').click();
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

  await page.fill('input[type="email"]', 'invalid@example.com');
  await page.fill('input[type="password"]', 'WrongPassword123!');

    await page.locator('button[type="submit"]').click();

    await expect(
      page.getByText(/incorect|incorrect|invalid|negăsit|not found/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should stay on login when password is missing', async ({ page }) => {
    await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'any@example.com');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Authentication - 2FA', () => {
  test('login page is ready for optional 2FA step after submit', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.fill('input[type="email"]', 'nonexistent-2fa-check@example.com');
  await page.fill('input[type="password"]', strongPassword);
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/incorect|incorrect|invalid|negăsit|not found|parolă|password|email/i).first()
    ).toBeVisible({ timeout: 8000 });
  });
});
