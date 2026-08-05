import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test('Login flow and WebSocket upgrade', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'admin@legxi.com');
    await page.fill('input[type="password"]', 'Password123!');
    
    // Setup a wait for the websocket upgrade event
    const wsPromise = page.waitForEvent('websocket', { timeout: 15000 }).catch(() => null);

    // Setup a wait for the polling responses to ensure we are connected
    const pollingPromise = page.waitForResponse(
      response => response.url().includes('/api/proxy/socket.io') && response.url().includes('transport=polling') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    // Click sign in
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 10000 });

    // Wait for the websocket / polling
    const ws = await wsPromise;
    const pollingResponse = await pollingPromise;
    
    // Verify polling or WebSocket upgraded successfully
    expect(pollingResponse || ws).toBeTruthy();
    if (ws) {
      expect(ws.url()).toContain('/api/proxy/socket.io');
    }
  });
});
