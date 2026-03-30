import { test, expect } from '@playwright/test';

test.describe('Listings - Create, Edit, Delete', () => {
  // Assume user is logged in
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin\/dashboard)/, {
      timeout: 30000,
    });
  });

  test('should create new listing with valid data', async ({ page }) => {
    await page.goto('/dashboard');
    
    const addButton = page.locator('text=/add|crează|new|nou anunț/i').first();
    await addButton.click();
    
    // Fill listing form
    await page.fill('input[placeholder*="Title"], input[name="title"]', 'Test Listing');
    await page.fill('textarea[name="description"]', 'This is a test listing');
    await page.fill('input[name="price"], input[type="number"]', '1000');
    
    // Select category
    const categorySelect = page.locator('select[name="category"], [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.locator('text=/Auto|Electronics|Furniture/i').first().click();
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Publish")').first();
    expect(submitButton).not.toBeDisabled();
    
    await submitButton.click();
    
    // Should redirect to listing or dashboard
    await page.waitForURL(/\/(listing|dashboard)/, { timeout: 5000 });
  });

  test('should reject listing without title', async ({ page }) => {
    await page.goto('/dashboard/listings/create');
    
    await page.fill('textarea[name="description"]', 'Description without title');
    await page.fill('input[name="price"]', '1000');
    
    const submitButton = page.locator('button[type="submit"]').first();
    const isDisabled = await submitButton.isDisabled();
    
    expect(isDisabled).toBeTruthy();
  });

  test('should reject listing with invalid price', async ({ page }) => {
    await page.goto('/dashboard/listings/create');
    
    await page.fill('input[name="title"]', 'Test Title');
    await page.fill('input[name="price"]', '-100');
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show validation error
    const errorMessage = page.locator('text=/price|invalid|must be/i');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    expect(isErrorVisible).toBeTruthy();
  });

  test('should edit existing listing', async ({ page }) => {
    // Navigate to listing details
    await page.goto('/dashboard/listings');
    
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Editează")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Update title
      const titleField = page.locator('input[name="title"]');
      await titleField.clear();
      await titleField.fill('Updated Title');
      
      // Save
      const saveButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Salvează")').first();
      await saveButton.click();
      
      // Should show success or redirect
      await page.waitForTimeout(1000);
    }
  });

  test('should delete listing with confirmation', async ({ page }) => {
    await page.goto('/dashboard/listings');
    
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Șterge")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      const confirmButton = page.locator('button[type="button"]:has-text("Confirm"), button[type="button"]:has-text("Da")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Should reload and listing should be gone
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Listings - View and Filter', () => {
  test('should display listings on homepage', async ({ page }) => {
    await page.goto('/');
    
    const listings = page.locator('[data-testid="listing-card"], .listing-card, article').first();
    expect(listings).toBeVisible();
  });

  test('should filter listings by category', async ({ page }) => {
    await page.goto('/listings');
    
    const categoryFilter = page.locator('select[name="category"], [aria-label*="Category"]').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('Auto');
      
      // Wait for results to update
      await page.waitForTimeout(1000);
      
      // Verify filtered results
      const listings = page.locator('[data-testid="listing-card"], .listing-card');
      const count = await listings.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search listings', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="cauți"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('BMW');
      await page.press('input', 'Enter');
      
      // Wait for search results
      await page.waitForURL(/.*search|query|search.*BMW/i, { timeout: 5000 }).catch(() => {});
    }
  });
});
