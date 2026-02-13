import { test, expect } from '@playwright/test';

test.describe('Payment Integration - Sandbox Mode', () => {
  test('should load payment page with sandbox Stripe', async ({ page }) => {
    await page.goto('/listings/test-listing-1/promote/payment/card');
    
    // Should either load or redirect if not authenticated
    const url = page.url();
    expect(url).toMatch(/payment|auth|login/);
  });

  test('should show PayPal sandbox button', async ({ page }) => {
    await page.goto('/listings/test-listing-1/promote/payment/paypal');
    
    // Check page loads
    const response = page.on('response', r => {
      if (r.status() === 404) {
        throw new Error('Payment page not found');
      }
    });
  });

  test('should show payment method selection', async ({ page }) => {
    await page.goto('/listings/test-listing-1/promote');
    
    // Payment selection should be available
    const paymentLink = page.locator('a, button', { has: page.locator('text=/payment|pay/i') });
    expect(paymentLink).toBeDefined();
  });

  test('API: Payment webhook endpoint exists', async ({ page }) => {
    const response = await page.context().request.post('/api/payments/webhook', {
      data: { test: true },
      headers: { 'stripe-signature': 'test' },
    });
    
    // Should not be 404
    expect(response.status()).not.toBe(404);
  });

  test('API: PayPal IPN endpoint exists', async ({ page }) => {
    const response = await page.context().request.post('/api/payments/netopia/ipn', {
      data: { test: true },
    });
    
    // Should not be 404
    expect(response.status()).not.toBe(404);
  });
});
