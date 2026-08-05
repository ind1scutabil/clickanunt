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
    // Scoped to the login form's own submit button: an unscoped
    // getByRole('button') also matches the cookie-consent banner's buttons
    // (Acceptă/Refuză/Preferințe/Setări cookie), which legitimately render on
    // every page — that is not a form-controls regression, just a stale
    // selector that predates the consent banner.
    await expect(
      page.getByRole('button', { name: 'Conectează-te' })
    ).toBeVisible();
  });
});
