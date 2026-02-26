import { expect, test } from '@playwright/test';

test.describe('Critical Enterprise Web Flows', () => {
  test('homepage renders and exposes core navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: /login|autentificare|cont/i }).first()).toBeVisible();
  });

  test('login page renders form controls', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('textbox').first()).toBeVisible();
    await expect(page.getByRole('button')).toBeVisible();
  });
});
