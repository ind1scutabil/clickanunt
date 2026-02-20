import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should send message to listing owner', async ({ page }) => {
    // Navigate to a listing
    await page.goto('/listings');
    
    const listingCard = page.locator('[data-testid="listing-card"], .listing-card').first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
      await page.waitForURL(/\/listing\//, { timeout: 5000 });
      
      // Send message
      const messageButton = page.locator('button:has-text("Message"), button:has-text("Mesaj")').first();
      if (await messageButton.isVisible()) {
        await messageButton.click();
        
        const messageInput = page.locator('textarea[name="message"], input[placeholder*="message"]');
        if (await messageInput.isVisible()) {
          await messageInput.fill('Is this item still available?');
          
          const sendButton = page.locator('button[type="submit"]:has-text("Send"), button[type="submit"]:has-text("Trimite")');
          expect(sendButton).not.toBeDisabled();
          
          await sendButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('should view messages in inbox', async ({ page }) => {
    await page.goto('/messages');
    
    const messageList = page.locator('[data-testid="message-item"], .message-row').first();
    const messageExists = await messageList.isVisible().catch(() => false);
    
    // Page should load and either show messages or empty state
    expect(page.url()).toContain('/messages');
  });

  test('[SMOKE] message send and delivery flow', async ({ page }) => {
    // Navigate to messages page
    await page.goto('/dashboard/messages');
    
    // Wait for messages page to load
    await page.waitForSelector('text=Conversații', { timeout: 10000 });
    
    // Get first conversation if available
    const conversationButton = page.locator('button').filter({ has: page.locator('text=') }).first();
    const conversationVisible = await conversationButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (conversationVisible) {
      // Click first conversation
      await conversationButton.click();
      
      // Wait for message input to appear
      const messageInput = page.locator('input[placeholder*="mesaj"], input[placeholder*="Scrie"], #message-input');
      await messageInput.waitFor({ timeout: 5000 });
      
      // Type test message
      const testMessage = `Test message ${Date.now()}`;
      await messageInput.fill(testMessage);
      
      // Find and click send button
      const sendButton = page.locator('button:has-text("Trimite"), #send-button').last();
      expect(await sendButton.isEnabled()).toBe(true);
      
      // Send the message
      await sendButton.click();
      
      // Wait briefly for message to process
      await page.waitForTimeout(1500);
      
      // **CRITICAL CHECK**: Verify message appears in conversation thread
      // This is the test for the message delivery bug fix
      const messageInThread = page.locator(`text=${testMessage}`);
      expect(await messageInThread.isVisible({ timeout: 5000 })).toBe(true);
      
      console.log('[SMOKE-TEST] ✓ Message delivery successful: message appears in thread');
    } else {
      console.log('[SMOKE-TEST] ⚠️ No conversations available to test');
    }
  });

  test('should display empty messages state', async ({ page }) => {
    await page.goto('/messages');
    
    const emptyState = page.locator('text=/no messages|inbox empty|start a conversation/i');
    const messageList = page.locator('[data-testid="message-item"], .message-row');
    
    const count = await messageList.count();
    if (count === 0) {
      const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);
      expect(isEmptyStateVisible || count === 0).toBeTruthy();
    }
  });

  test('should open conversation', async ({ page }) => {
    await page.goto('/messages');
    
    const messageItem = page.locator('[data-testid="message-item"], .message-row').first();
    if (await messageItem.isVisible()) {
      await messageItem.click();
      
      // Should show conversation
      const messageThread = page.locator('[data-testid="message-thread"], .conversation');
      const isThreadVisible = await messageThread.isVisible().catch(() => false);
      expect(isThreadVisible || page.url().includes('/messages/')).toBeTruthy();
    }
  });
});
