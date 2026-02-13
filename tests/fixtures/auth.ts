import { test as base, expect, Page } from '@playwright/test';

type AuthFixture = {
  userPage: Page;
  adminPage: Page;
  authenticatedPage: (email: string, password: string) => Promise<Page>;
};

export const test = base.extend<AuthFixture>({
  // User page fixture - eslint-disable-next-line
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    await use(page);
    await context.close();
  },

  // Admin page fixture - eslint-disable-next-line
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@clickanunt.ro');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    await use(page);
    await context.close();
  },

  // Authenticated page helper - eslint-disable-next-line
  authenticatedPage: async ({ browser }, use) => {
    const getAuthPage = async (email: string, password: string) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      
      return page;
    };
    
    await use(getAuthPage);
  },
});

export { expect };
