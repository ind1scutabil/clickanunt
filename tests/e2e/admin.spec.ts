import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const ADMIN_STORAGE_STATE = path.resolve(__dirname, '.auth/admin.json');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@clickanunt.ro';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Admin Dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test.beforeAll(async ({ request, baseURL }) => {
    const csrfRes = await request.get('/api/csrf');
    if (!csrfRes.ok()) {
      throw new Error(`Failed to fetch CSRF token (status ${csrfRes.status()})`);
    }

    const csrfData = (await csrfRes.json()) as { csrfToken?: string };
    if (!csrfData.csrfToken) {
      throw new Error('CSRF token missing in /api/csrf response');
    }

    const loginRes = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'x-csrf-token': csrfData.csrfToken },
    });

    const loginData = await loginRes.json();

    if (loginRes.status() === 206) {
      throw new Error(
        'Admin login requires 2FA. Disable ADMIN_2FA_ENABLED in test env or use a non-2FA admin user for E2E.'
      );
    }

    if (loginRes.status() !== 200) {
      const errorMessage = loginData?.error?.message || loginData?.error || loginData?.message || 'Unknown login error';
      throw new Error(`Admin login failed (${loginRes.status()}): ${errorMessage}`);
    }

    const storageState = await request.storageState();
    const origin = new URL(baseURL || 'http://localhost:3000').origin;
    const user = loginData?.user;

    storageState.origins = storageState.origins || [];
    const existingOrigin = storageState.origins.find((o) => o.origin === origin);
    const targetOrigin = existingOrigin || { origin, localStorage: [] as { name: string; value: string }[] };

    const setLocalStorageItem = (name: string, value: string | undefined) => {
      if (!value) return;
      const index = targetOrigin.localStorage.findIndex((item) => item.name === name);
      const entry = { name, value };
      if (index >= 0) {
        targetOrigin.localStorage[index] = entry;
      } else {
        targetOrigin.localStorage.push(entry);
      }
    };

    if (user) {
      setLocalStorageItem('user', JSON.stringify(user));
    }

    if (!existingOrigin) {
      storageState.origins.push(targetOrigin);
    }

    await fs.mkdir(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });
    await fs.writeFile(ADMIN_STORAGE_STATE, JSON.stringify(storageState, null, 2), 'utf-8');
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should not redirect away
    expect(page.url()).toContain('/admin');
    
    // Should show admin content
    const adminHeader = page.locator('text=/admin|dashboard|moderare/i').first();
    await expect(adminHeader).toBeVisible();
  });

  test('admin dashboard shows command center with moderation links', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const commandCenter = page.getByTestId('admin-command-center');
    await expect(commandCenter).toBeVisible();
    await expect(page.getByTestId('admin-command-card-moderation')).toBeVisible();
    await expect(page.getByTestId('admin-moderation-link-pending')).toHaveAttribute(
      'href',
      '/admin/moderation?tab=pending'
    );
    await expect(page.getByTestId('admin-command-card-promotions')).toHaveAttribute(
      'href',
      '/admin/promotions'
    );
  });

  test('legacy /admin/listings redirects to moderation pending', async ({ page }) => {
    await page.goto('/admin/listings');
    await page.waitForURL(/\/admin\/moderation/);
    expect(page.url()).toContain('/admin/moderation');
    expect(page.url()).toContain('tab=pending');
  });

  test('legacy /admin/listings?status=pending redirects to pending tab', async ({ page }) => {
    await page.goto('/admin/listings?status=pending');
    await page.waitForURL(/\/admin\/moderation\?tab=pending/);
    expect(page.url()).toContain('tab=pending');
  });

  test('should approve listing from moderation queue when available', async ({ page }) => {
    await page.goto('/admin/moderation?tab=pending');
    
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Aprobă")').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should reject listing from moderation queue when available', async ({ page }) => {
    await page.goto('/admin/moderation?tab=pending');
    
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Respinge")').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      const reasonInput = page.locator('textarea[name="reason"], input[placeholder*="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Violates community guidelines');
      }
      
      const confirmButton = page.locator('button[type="submit"]:has-text("Confirm"), button[type="submit"]:has-text("Confirmare")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('soft-delete from moderation listings when available', async ({ page }) => {
    await page.goto('/admin/moderation?tab=approved');
    
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Șterge")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const confirmButton = page.locator('button[type="button"]:has-text("Confirm"), button[type="button"]:has-text("Da")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('legacy /admin/users redirects to moderation users tab', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL(/\/admin\/moderation/);
    expect(page.url()).toContain('tab=users');
  });

  test('should ban user when control available', async ({ page }) => {
    await page.goto('/admin/moderation?tab=users');
    
    const banButton = page.locator('button:has-text("Ban"), button:has-text("Blocează")').first();
    if (await banButton.isVisible()) {
      await banButton.click();
      
      const reasonInput = page.locator('textarea[name="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Violates terms of service');
      }
      
      const confirmButton = page.locator('button[type="submit"]:has-text("Ban")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('should unban user when control available', async ({ page }) => {
    await page.goto('/admin/moderation?tab=users');
    
    const unbanButton = page.locator('button:has-text("Unban"), button:has-text("Deblochează")').first();
    if (await unbanButton.isVisible()) {
      await unbanButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should view moderation queue', async ({ page }) => {
    await page.goto('/admin/moderation');
    
    expect(page.url()).toContain('/admin/moderation');
  });

  test('legacy /admin/analytics redirects to dashboard', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForURL(/\/admin\/dashboard/);
    expect(page.url()).toContain('/admin/dashboard');
  });
});

test.describe('Admin - Route Protection', () => {
  test('should redirect unauthenticated user to login on /admin/dashboard', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });

  test('should redirect non-admin user from admin routes', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 30000 });

    const role = await page.evaluate(() => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.role as string | undefined;
      } catch {
        return undefined;
      }
    });
    test.skip(
      role === 'admin' || role === 'owner',
      'user@example.com is admin/owner in this DB; use a non-admin seed user to assert admin denial'
    );

    await page.goto('/admin/dashboard');

    // Admin dashboard redirects non-admin users to home (see app/admin/dashboard/page.tsx)
    await expect(page).toHaveURL(
      (url) => {
        try {
          return new URL(url).pathname === '/';
        } catch {
          return false;
        }
      },
      { timeout: 20000 }
    );
  });

  test('should return 401 or 403 for unauthenticated admin API', async ({ page }) => {
    const response = await page.request.get('/api/admin/users');

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Admin mobile bottom nav (authenticated)', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test.beforeAll(async ({ request, baseURL }) => {
    try {
      await fs.access(ADMIN_STORAGE_STATE);
    } catch {
      const csrfRes = await request.get('/api/csrf');
      const csrfData = (await csrfRes.json()) as { csrfToken?: string };
      const loginRes = await request.post('/api/auth/login', {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        headers: { 'x-csrf-token': csrfData.csrfToken || '' },
      });
      if (loginRes.status() !== 200) {
        throw new Error(`Admin login for mobile nav failed: ${loginRes.status()}`);
      }
      const loginData = await loginRes.json();
      const storageState = await request.storageState();
      const origin = new URL(baseURL || 'http://localhost:3000').origin;
      storageState.origins = storageState.origins || [];
      const existingOrigin = storageState.origins.find((o) => o.origin === origin);
      const targetOrigin = existingOrigin || { origin, localStorage: [] as { name: string; value: string }[] };
      if (loginData?.user) {
        const idx = targetOrigin.localStorage.findIndex((i) => i.name === 'user');
        const entry = { name: 'user', value: JSON.stringify(loginData.user) };
        if (idx >= 0) targetOrigin.localStorage[idx] = entry;
        else targetOrigin.localStorage.push(entry);
      }
      if (!existingOrigin) storageState.origins.push(targetOrigin);
      await fs.mkdir(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });
      await fs.writeFile(ADMIN_STORAGE_STATE, JSON.stringify(storageState, null, 2), 'utf-8');
    }
  });

  test('shows Moderare link for authenticated admin', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.getByRole('navigation', { name: 'Navigare rapidă' });
    const moderare = bottom.getByRole('link', { name: /moderare/i });
    await expect(moderare).toBeVisible({ timeout: 15000 });
    await expect(moderare).toHaveAttribute('href', '/admin/moderation');
  });

  test('hamburger: Deconectare visible (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: /Deschide|închide meniu/i }).click();
    const sheet = page.getByRole('navigation', { name: 'Navigare mobilă' });
    await expect(sheet.getByRole('button', { name: /deconectare/i })).toBeVisible({ timeout: 10000 });
    await expect(sheet.getByRole('link', { name: /admin.*moderare|moderare/i })).toBeVisible();
  });

  test('hamburger: Deconectare visible (iPhone 14 Pro Max)', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/');
    await page.getByRole('button', { name: /Deschide|închide meniu/i }).click();
    const sheet = page.getByRole('navigation', { name: 'Navigare mobilă' });
    await expect(sheet.getByRole('button', { name: /deconectare/i })).toBeVisible({ timeout: 10000 });
  });

  test('hamburger: Deconectare visible (Android narrow)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.getByRole('button', { name: /Deschide|închide meniu/i }).click();
    const sheet = page.getByRole('navigation', { name: 'Navigare mobilă' });
    await expect(sheet.getByRole('button', { name: /deconectare/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin mobile bottom nav (anonymous)', () => {
  test('hides Moderare link without admin session', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.getByRole('navigation', { name: 'Navigare rapidă' });
    await expect(bottom.getByRole('link', { name: /^Moderare$/ })).toHaveCount(0);
  });

  test('localStorage admin stub alone does not unlock Moderare', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: '00000000-0000-4000-8000-000000000099',
          email: 'admin-e2e-stub@clickanunt.ro',
          role: 'admin',
          name: 'E2E Stub',
        })
      );
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.getByRole('navigation', { name: 'Navigare rapidă' });
    await expect(bottom.getByRole('link', { name: /^Moderare$/ })).toHaveCount(0);
  });
});
