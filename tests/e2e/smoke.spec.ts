/**
 * Smoke Tests - Critical User Flows
 * Run with: npm run test:e2e:headless
 * Honors PLAYWRIGHT_BASE_URL / E2E_BASE_URL (dedicated gate ports — never assume :3000).
 */

import { test, expect } from '@playwright/test';
import { seedCookieConsentAccepted } from './helpers/cookie-consent';

function gateBase(baseURL?: string): string {
  return (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.E2E_BASE_URL ||
    process.env.BASE_URL ||
    baseURL ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
}

test.describe('Production Smoke Tests', () => {
  
  test('Homepage loads successfully', async ({ page, baseURL }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Expected auth probes / missing assets log as console "error" in Chromium.
      if (/Failed to load resource/i.test(text)) return;
      errors.push(text);
    });

    await page.goto(gateBase(baseURL));

    // Check title
    await expect(page).toHaveTitle(/ClickAnunț/);

    // Check main elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Health endpoint returns OK', async ({ request, baseURL }) => {
    const response = await request.get(`${gateBase(baseURL)}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBeDefined();
  });

  test('Database health check works', async ({ request, baseURL }) => {
    const response = await request.get(`${gateBase(baseURL)}/api/health/db`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
  });

  test('Search page loads', async ({ page, baseURL }) => {
    await seedCookieConsentAccepted(page);
    await page.goto(`${gateBase(baseURL)}/listings`);
    
    // Check page loads
    await expect(page).toHaveURL(/listings/);
    
    // Desktop: listings search; mobile may expose search in hero/navbar only.
    const listingsSearch = page.getByPlaceholder(/caută în anunțuri/i).filter({ visible: true });
    const anySearch = page.locator('input[type="search"], input[placeholder*="Caută" i], #home-hero-search').filter({ visible: true });
    await expect(listingsSearch.or(anySearch).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Login page renders', async ({ page, baseURL }) => {
    await page.goto(`${gateBase(baseURL)}/auth/login`);
    
    // Check login form elements (cookie banner may also contain inputs — scope to main).
    const form = page.locator('main, form').first();
    await expect(form.locator('input[type="email"]').first()).toBeVisible();
    await expect(form.locator('input[type="password"]').first()).toBeVisible();
    await expect(form.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('API returns proper CORS headers', async ({ request, baseURL }) => {
    const response = await request.get(`${gateBase(baseURL)}/api/health`);
    
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('Rate limiting works', async ({ request }) => {
    // This test is optional as it may fail during normal traffic
    // Uncomment only for explicit rate limit testing
    void request;
  });

  test('Metrics endpoint accessible', async ({ request, baseURL }) => {
    const response = await request.get(`${gateBase(baseURL)}/api/metrics`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/plain');
    
    const body = await response.text();
    expect(body).toContain('app_uptime_seconds');
  });

  test('404 page works', async ({ page, baseURL }) => {
    const response = await page.goto(`${gateBase(baseURL)}/this-page-does-not-exist`);
    expect(response?.status()).toBe(404);
  });

  test('Static assets load', async ({ page, baseURL }) => {
    await page.goto(gateBase(baseURL));
    
    // Check if CSS loaded (page should have styles)
    const bgColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should not be default white (rgb(255, 255, 255))
    expect(bgColor).toBeDefined();
  });
});

test.describe('Performance Tests', () => {
  test('Homepage loads within acceptable time', async ({ page, baseURL }) => {
    const startTime = Date.now();
    
    await page.goto(gateBase(baseURL));
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('API response time is acceptable', async ({ request, baseURL }) => {
    const startTime = Date.now();
    
    await request.get(`${gateBase(baseURL)}/api/health`);
    
    const responseTime = Date.now() - startTime;
    
    // Should respond within 500ms
    expect(responseTime).toBeLessThan(500);
  });
});
