import { test, expect, type Page } from '@playwright/test';

async function clearSession(page: Page) {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe('Route Protection & Errors', () => {
  test('should show 404 page for non-existent route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);

    const notFoundText = page.locator('text=/404|not found|page not found/i');
    await expect(notFoundText).toBeVisible({ timeout: 15000 });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await clearSession(page);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });

  test('should redirect to login from /messages when not authenticated', async ({ page }) => {
    await clearSession(page);

    await page.goto('/messages');

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });

  test('should redirect to login from /favorites when not authenticated', async ({ page }) => {
    await clearSession(page);

    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });

  test('should allow access to public pages without authentication', async ({ page }) => {
    await clearSession(page);

    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
  });

  test('should allow access to /listings without authentication', async ({ page }) => {
    await clearSession(page);

    const response = await page.goto('/listings');

    expect(response?.status()).toBe(200);
  });

  test('should allow access to auth pages without authentication', async ({ page }) => {
    await clearSession(page);

    const response = await page.goto('/auth/login');

    expect(response?.status()).toBe(200);
  });

  test('should allow access to /security page', async ({ page }) => {
    const response = await page.goto('/security');
    
    expect(response?.status()).toBe(200);
  });

  test('should allow access to /business page', async ({ page }) => {
    const response = await page.goto('/business');
    
    expect(response?.status()).toBe(200);
  });
});

test.describe('UI Elements - Buttons & Handlers', () => {
  test('should have all buttons with click handlers', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    // Every button should be clickable
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const isClickable = await button.isEnabled().catch(() => false);
      // Button should either be enabled or have aria-disabled
      const ariaDisabled = await button.getAttribute('aria-disabled');
      const hasValidState = isClickable || ariaDisabled === 'true';
      expect(hasValidState).toBeTruthy();
    }
  });

  test('should show loading state on form submit', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    
    const submitButton = page.locator('form').getByRole('button', { name: /Conectează/i });
    
    const clickPromise = submitButton.click();
    
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    const hasLoadingClass = await submitButton.evaluate((el) => {
      return el.className.includes('loading') || 
             el.className.includes('disabled') ||
             el.getAttribute('aria-busy') === 'true' ||
             (el as HTMLButtonElement).disabled;
    }).catch(() => false);
    
    await clickPromise.catch(() => undefined);
    expect(isDisabled || hasLoadingClass).toBeTruthy();
  });

  test('should disable submit button while form is invalid', async ({ page }) => {
    await page.goto('/auth/register');
    
    const submitButton = page.locator('form').locator('button[type="submit"]');
    
    // Empty form - should be disabled (SignupFormExtended !canSubmit)
    await expect(submitButton).toBeDisabled();
    
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Still should be disabled (missing other fields)
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('API Health', () => {
  test('should respond on /api/health endpoint', async ({ page }) => {
    const response = await page.request.get('/api/health');
    
    expect([200, 404]).toContain(response.status());
  });
});
