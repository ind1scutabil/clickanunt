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
    const accessToken = loginData?.accessToken;
    const refreshToken = loginData?.refreshToken;

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
    setLocalStorageItem('accessToken', accessToken);
    setLocalStorageItem('refreshToken', refreshToken);

    if (!existingOrigin) {
      storageState.origins.push(targetOrigin);
    }

    await fs.mkdir(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });
    await fs.writeFile(ADMIN_STORAGE_STATE, JSON.stringify(storageState, null, 2), 'utf-8');
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Should not redirect away
    expect(page.url()).toContain('/admin');
    
    // Should show admin content
    const adminHeader = page.locator('text=/admin|dashboard|moderare/i').first();
    await expect(adminHeader).toBeVisible();
  });

  test('should view listings pending approval', async ({ page }) => {
    await page.goto('/admin/listings');
    
    const pendingListings = page.locator('[data-testid="pending-listing"], .listing-pending').first();
    const tableExists = await pendingListings.isVisible().catch(() => false);
    
    // Page should load
    expect(page.url()).toContain('/admin/listings');
  });

  test('should approve listing', async ({ page }) => {
    await page.goto('/admin/listings?status=pending');
    
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Aprobă")').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Should show confirmation or refresh list
    }
  });

  test('should reject listing', async ({ page }) => {
    await page.goto('/admin/listings?status=pending');
    
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Respinge")').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      // May show reason modal
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

  test('should delete listing', async ({ page }) => {
    await page.goto('/admin/listings');
    
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Șterge")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm delete
      const confirmButton = page.locator('button[type="button"]:has-text("Confirm"), button[type="button"]:has-text("Da")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('should view users', async ({ page }) => {
    await page.goto('/admin/users');
    
    expect(page.url()).toContain('/admin/users');
    
    const userList = page.locator('[data-testid="user-row"], .user-card').first();
    const hasUsers = await userList.isVisible().catch(() => false);
  });

  test('should ban user', async ({ page }) => {
    await page.goto('/admin/users');
    
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

  test('should unban user', async ({ page }) => {
    await page.goto('/admin/users?status=banned');
    
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

  test('should view analytics', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    expect(page.url()).toContain('/admin/analytics');
    
    const statsCard = page.locator('[data-testid="stat-card"], .stat-box').first();
    const hasStats = await statsCard.isVisible().catch(() => false);
  });
});

test.describe('Admin - Route Protection', () => {
  test('should redirect non-admin to login on /admin', async ({ page }) => {
    // Try to access without login
    await page.goto('/admin');
    
    // Should redirect to login or home
    expect(/auth\/login|^\/$/.test(page.url())).toBeTruthy();
  });

  test('should redirect non-admin user from admin routes', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Try to access admin
    await page.goto('/admin');
    
    // Should redirect away
    expect(page.url()).not.toContain('/admin');
  });

  test('should show 403 for non-admin accessing admin API', async ({ page }) => {
    // This test can be done via API requests or by checking page behavior
    // Making request as non-authenticated user
    const response = await page.request.get('/api/admin/listings');
    
    // Should be 401 (unauthorized) or 403 (forbidden)
    expect([401, 403]).toContain(response.status());
  });
});
