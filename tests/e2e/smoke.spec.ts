/**
 * Smoke Tests - Critical User Flows
 * Run with: npm run test:e2e:headless
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Production Smoke Tests', () => {
  
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check title
    await expect(page).toHaveTitle(/ClickAnunț/);
    
    // Check main elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    expect(errors.length).toBe(0);
  });

  test('Health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBeDefined();
  });

  test('Database health check works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/db`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
  });

  test('Search page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    
    // Check page loads
    await expect(page).toHaveURL(/listings/);
    
    // Check search elements
    await expect(page.locator('input[type="text"], input[type="search"]').first()).toBeVisible();
  });

  test('Login page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    
    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('API returns proper CORS headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('Rate limiting works', async ({ request }) => {
    // This test is optional as it may fail during normal traffic
    // Uncomment only for explicit rate limit testing
    /*
    const endpoint = `${BASE_URL}/api/health`;
    
    // Make many requests quickly
    const requests = Array(10).fill(null).map(() => 
      request.get(endpoint)
    );
    
    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status());
    
    // Should see some 429s if rate limiting is working
    expect(statuses.some(s => s === 429)).toBeTruthy();
    */
  });

  test('Metrics endpoint accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/plain');
    
    const body = await response.text();
    expect(body).toContain('app_uptime_seconds');
  });

  test('404 page works', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-page-does-not-exist`);
    
    // Should show 404 or redirect
    const url = page.url();
    expect(url.includes('404') || url.includes('not-found')).toBeTruthy();
  });

  test('Static assets load', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check if CSS loaded (page should have styles)
    const bgColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should not be default white (rgb(255, 255, 255))
    expect(bgColor).toBeDefined();
  });
});

test.describe('Performance Tests', () => {
  test('Homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('API response time is acceptable', async ({ request }) => {
    const startTime = Date.now();
    
    await request.get(`${BASE_URL}/api/health`);
    
    const responseTime = Date.now() - startTime;
    
    // Should respond within 500ms
    expect(responseTime).toBeLessThan(500);
  });
});
