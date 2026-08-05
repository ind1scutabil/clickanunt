import { test, expect } from '@playwright/test';

/**
 * Payment surface smoke — no real Stripe charges.
 * Asserts fail-closed routes and that unpaid providers stay disabled.
 */
test.describe('Payment Integration - Sandbox Mode', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should load payment page with sandbox Stripe', async ({ page }) => {
    test.setTimeout(60_000);
    const res = await page.goto('/listings/test-listing-1/promote/payment/card', {
      waitUntil: 'domcontentloaded',
    });
    expect(res).not.toBeNull();
    expect(res!.status()).not.toBe(404);
    // Unauthenticated or invalid listing — page still renders a card/promote/auth surface.
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/payment|auth|login|promote/);
    // Unload Stripe.js before context teardown (otherwise close() can hang past timeout).
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
  });

  test('PayPal page does not activate promotion API', async ({ page }) => {
    const promotePosts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/listings\/.+\/promote$/.test(req.url())) {
        promotePosts.push(req.url());
      }
    });
    await page.goto('/listings/test-listing-1/promote/payment/paypal', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: /PayPal indisponibil/i })).toBeVisible({
      timeout: 10_000,
    });
    expect(promotePosts).toEqual([]);
  });

  test('promote page loads without 5xx for unknown listing', async ({ page }) => {
    const res = await page.goto('/listings/test-listing-1/promote', {
      waitUntil: 'domcontentloaded',
    });
    expect(res).not.toBeNull();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('API: Payment webhook endpoint exists and rejects unsigned body', async ({ request }) => {
    const response = await request.post('/api/payments/webhook', {
      data: { test: true },
      headers: { 'stripe-signature': 'test' },
    });
    expect(response.status()).not.toBe(404);
    expect([400, 401, 403]).toContain(response.status());
  });

  test('API: Netopia initiate is disabled for authenticated shape', async ({ request }) => {
    const response = await request.post('/api/payments/netopia', {
      data: { userId: 'x', amount: 100 },
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).not.toBe(404);
    // CSRF/auth/disabled — never 200 success for initiation.
    expect(response.status()).not.toBe(200);
  });

  test('API: unpaid promote POST is refused', async ({ request }) => {
    const response = await request.post(
      '/api/listings/11111111-1111-4111-8111-111111111111/promote',
      {
        data: { packageId: 'featured', amountBani: 1900, paymentMethod: 'paypal' },
        headers: { 'content-type': 'application/json', 'x-csrf-token': 'x' },
      }
    );
    expect(response.status()).not.toBe(200);
  });
});
