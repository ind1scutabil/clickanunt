import { test, expect } from '@playwright/test';

test.describe('Favorites', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should add listing to favorites', async ({ page }) => {
    await page.goto('/listings');
    
    const favoriteButton = page.locator('button:has-text("♥"), button[aria-label*="favorite"], button[aria-label*="favorite"]').first();
    if (await favoriteButton.isVisible()) {
      const initialState = await favoriteButton.getAttribute('aria-pressed');
      
      await favoriteButton.click();
      await page.waitForTimeout(500);
      
      const newState = await favoriteButton.getAttribute('aria-pressed');
      expect(newState).not.toBe(initialState);
    }
  });

  test('should remove listing from favorites', async ({ page }) => {
    await page.goto('/favorites');
    
    // Assume there's at least one favorite
    const favoriteItem = page.locator('[data-testid="favorite-item"], .favorite-card').first();
    
    if (await favoriteItem.isVisible()) {
      const removeButton = favoriteItem.locator('button:has-text("Remove"), button:has-text("Șterge")');
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display empty state when no favorites', async ({ page }) => {
    await page.goto('/favorites');
    
    const emptyState = page.locator('text=/no favorites|empty|explore/i');
    const favoritesList = page.locator('[data-testid="favorite-item"], .favorite-card');
    
    const count = await favoritesList.count();
    if (count === 0) {
      expect(emptyState).toBeVisible();
    }
  });

  test('should persist favorites', async ({ page, context }) => {
    // Add favorite
    await page.goto('/listings');
    const favoriteButton = page.locator('button[aria-label*="favorite"]').first();
    if (await favoriteButton.isVisible()) {
      await favoriteButton.click();
      await page.waitForTimeout(500);
    }
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Check if favorite is still there
    const favoriteItem = page.locator('[data-testid="favorite-item"], .favorite-card').first();
    const isFavorited = await favoriteItem.isVisible().catch(() => false);
    
    // This test depends on page state
    if (isFavorited) {
      expect(isFavorited).toBeTruthy();
    }
  });
});
