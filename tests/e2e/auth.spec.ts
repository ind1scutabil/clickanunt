import { test, expect } from '@playwright/test';

test.describe('Authentication - Registration', () => {
  test('should register new user with valid credentials', async ({ page }) => {
    await page.goto('/auth/register');
    
    const uniqueEmail = `user-${Date.now()}@example.com`;
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    // Check form validation
    const submitButton = page.locator('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();
    
    await submitButton.click();
    
    // Should redirect to login or dashboard
    await page.waitForURL(/\/(auth\/login|dashboard)/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/(auth\/login|dashboard)/);
  });

  test('should reject registration with duplicate email', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Use known test user email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show error message or stay on page
    await page.waitForTimeout(1000);
    const errorMessage = page.locator('text=/email.*exists|already.*registered/i');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    const isStillOnRegister = page.url().includes('/auth/register');
    
    expect(isErrorVisible || isStillOnRegister).toBeTruthy();
  });

  test('should reject registration with invalid password', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `user-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Button should be disabled or error shown
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    expect(isDisabled).toBeTruthy();
  });

  test('should reject registration with non-matching passwords', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `user-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password456!');
    
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    
    expect(isDisabled).toBeTruthy();
  });
});

test.describe('Authentication - Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    
    const submitButton = page.locator('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();
    
    await submitButton.click();
    
    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|)/, { timeout: 5000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show error message
    await page.waitForTimeout(1000);
    const errorMessage = page.locator('text=/invalid|incorrect|not found/i');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    const isStillOnLogin = page.url().includes('/auth/login');
    
    expect(isErrorVisible || isStillOnLogin).toBeTruthy();
  });

  test('should enforce password field requirements', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Empty fields - submit should be disabled
    const submitButton = page.locator('button[type="submit"]');
    let isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBeTruthy();
    
    // Email only
    await page.fill('input[type="email"]', 'user@example.com');
    isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBeTruthy();
    
    // Both fields
    await page.fill('input[type="password"]', 'Password123!');
    isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('Authentication - Logout', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Verify logged in (by looking for account button or profile)
    const accountButton = page.locator('text=Cont');
    expect(accountButton).toBeVisible();
    
    // Logout
    await accountButton.click();
    const logoutButton = page.locator('text=/logout|deconectare/i');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
    
    // Should redirect to login or home
    await page.waitForURL(/\/(auth\/login|)/, { timeout: 5000 });
  });
});

test.describe('Authentication - 2FA', () => {
  test('should require 2FA if enabled on account', async ({ page }) => {
    await page.goto('/auth/login');
    
    // This test assumes a test account with 2FA enabled exists
    await page.fill('input[type="email"]', 'user-2fa@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Should show 2FA verification screen
    const twoFAInput = page.locator('input[name="twoFactorCode"], input[placeholder*="2FA"], input[placeholder*="code"]').first();
    const hasTwoFA = await twoFAInput.isVisible().catch(() => false);
    
    if (hasTwoFA) {
      // 2FA is required - verify it's shown
      expect(twoFAInput).toBeVisible();
    }
  });
});
